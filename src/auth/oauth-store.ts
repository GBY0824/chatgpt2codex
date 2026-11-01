import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile, chmod, open, unlink } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import { InvalidRequestError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";

/**
 * Simple JSON-file backed OAuth persistence (PRD §11 SR-08/SR-09) using the
 * MCP SDK OAuth store interfaces without a sqlite dependency.
 *
 * Persisted under `<stateDir>/oauth.json`:
 *  - registered clients (dynamic client registration)
 *  - access token records, keyed by SHA-256 hash of the raw token
 *  - refresh token records, keyed by SHA-256 hash of the raw token
 *
 * Hardening:
 *  - Raw tokens are never persisted — only their SHA-256 hash (base64url).
 *  - Refresh token rotation is one-time: `saveTokenPair` atomically deletes
 *    the consumed refresh token hash and inserts the new pair, or fails the
 *    whole operation if the consumed hash is already gone (replay defense).
 *  - Expired access/refresh tokens are swept on every load (SR-09 bounded
 *    growth) and file writes are atomic (temp file + rename).
 *  - Directory/file permissions are tightened to 0700/0600.
 */

const DIR_MODE = 0o700;
const FILE_MODE = 0o600;
const OAUTH_FILE = "oauth.json";

export interface PersistedAccessTokenRecord {
  clientId: string;
  scopes: string[];
  expiresAt: number; // epoch seconds
  resource?: string;
}

export interface PersistedRefreshTokenRecord {
  clientId: string;
  scopes: string[];
  expiresAt: number; // epoch seconds
  resource?: string;
}

export interface PersistedTokenPair {
  accessTokenHash: string;
  accessToken: PersistedAccessTokenRecord;
  refreshTokenHash: string;
  refreshToken: PersistedRefreshTokenRecord;
}

const ClientSchema = z.object({
  clientId: z.string(),
  clientJson: z.record(z.string(), z.unknown()),
  issuedAt: z.number(),
});

const AccessTokenSchema = z.object({
  tokenHash: z.string(),
  clientId: z.string(),
  scopes: z.array(z.string()),
  expiresAt: z.number(),
  resource: z.string().optional(),
});

const RefreshTokenSchema = z.object({
  tokenHash: z.string(),
  clientId: z.string(),
  scopes: z.array(z.string()),
  expiresAt: z.number(),
  resource: z.string().optional(),
});

const OAuthFileSchema = z.object({
  version: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  clients: z.array(ClientSchema),
  accessTokens: z.array(AccessTokenSchema),
  refreshTokens: z.array(RefreshTokenSchema),
});

type OAuthFile = z.infer<typeof OAuthFileSchema>;

function emptyFile(): OAuthFile {
  return { version: 1, updatedAt: Date.now(), clients: [], accessTokens: [], refreshTokens: [] };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function redirectHostAllowed(redirectUri: string, allowedHosts: string[]): boolean {
  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    return false;
  }
  if (["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) return true;
  return allowedHosts.includes(parsed.hostname);
}

/**
 * JSON-file backed OAuth store: registered clients + access/refresh tokens.
 * All mutating operations are serialized through an in-process mutex so
 * concurrent tool/HTTP handlers never interleave a read-modify-write cycle
 * (the file itself is written atomically via temp-file + rename).
 */
export class JsonOAuthStore {
  private readonly stateDir: string;
  private readonly filePath: string;
  private queue: Promise<unknown> = Promise.resolve();
  private cache: OAuthFile | undefined;
  private readonly writerLockPath: string;


  constructor(stateDir: string) {
    this.stateDir = stateDir;
    this.filePath = join(stateDir, OAUTH_FILE);
    this.writerLockPath = join(stateDir, "oauth-write.lock");

  }

  /**
   * An exclusive filesystem claim guards a whole read/modify/persist
   * transaction across independently running candidate processes.
   * The old production v0.2.0 DOES NOT honor this marker, so it must
   * still be stopped before sharing a state directory on live cutover.
   *
   * A process crash deliberately leaves a stale marker. Never guess that
   * its PID is safe to reclaim: PID reuse and in-progress writes make
   * automatic removal unsafe. Recovery requires owner intervention.
   */
  private async withWriterClaim<T>(fn: () => Promise<T>): Promise<T> {
    await this.ensureDir();
    const deadline = Date.now() + 5000;
    let handle: Awaited<ReturnType<typeof open>>;
    while (true) {
      try {
        handle = await open(this.writerLockPath, "wx", FILE_MODE);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          throw new Error("OAUTH_WRITE_LOCK_IO_FAILED", { cause: error });
        }
        if (Date.now() >= deadline) {
          throw new Error("OAUTH_WRITE_LOCK_BUSY_OR_STALE");
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
      }
    }
    try {
      await handle.writeFile(JSON.stringify({ version: 1, pid: process.pid, createdAt: Date.now() }));
      await handle.sync();
      return await fn();
    } finally {
      await handle.close();
      // Remove only the claim created by THIS process, after all async work
      // is complete. Other processes never remove another writer's marker.
      await unlink(this.writerLockPath);
    }
  }

  /** Serialize operations within this store instance, plus mutations
   * across candidate processes before reading and persisting OAuth JSON. */
  private locked<T>(fn: () => Promise<T>, write = false): Promise<T> {
    const action = () => write ? this.withWriterClaim(fn) : fn();
    const run = this.queue.then(action, action);
    // Do not wedge future requests after an explicit fail-closed rejection.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async ensureDir(): Promise<void> {
    await mkdir(this.stateDir, { recursive: true, mode: DIR_MODE });
    try {
      await chmod(this.stateDir, DIR_MODE);
    } catch {
      // Non-fatal: filesystem may not support POSIX permission bits.
    }
  }

  private async load(): Promise<OAuthFile> {
    // Only an ABSENT file is an uninitialized store. A corrupt, inaccessible,
    // unsupported or unreadable existing file must never become an empty
    // document: the next OAuth write would otherwise erase registered clients
    // and token records silently.
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.cache = emptyFile();
        return this.cache;
      }
      this.cache = undefined;
      throw new Error("OAUTH_STORE_READ_FAILED", { cause: error });
    }

    let document: unknown;
    try {
      document = JSON.parse(raw);
    } catch {
      this.cache = undefined;
      throw new Error("OAUTH_STORE_CORRUPT_REFUSE_WRITE");
    }
    const parsed = OAuthFileSchema.safeParse(document);
    if (!parsed.success || parsed.data.version !== 1) {
      this.cache = undefined;
      throw new Error("OAUTH_STORE_CORRUPT_REFUSE_WRITE");
    }
    this.cache = parsed.data;
    return this.cache;
  }

  private async persist(doc: OAuthFile): Promise<void> {
    await this.ensureDir();
    doc.updatedAt = Date.now();
    const tmp = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(doc, null, 2), { mode: FILE_MODE, encoding: "utf8" });
    await rename(tmp, this.filePath);
    try {
      await chmod(this.filePath, FILE_MODE);
    } catch {
      // Non-fatal.
    }
    this.cache = doc;
  }

  private sweepExpired(doc: OAuthFile, nowSeconds: number): void {
    doc.accessTokens = doc.accessTokens.filter((t) => t.expiresAt >= nowSeconds);
    doc.refreshTokens = doc.refreshTokens.filter((t) => t.expiresAt >= nowSeconds);
  }

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    return this.locked(async () => {
      const doc = await this.load();
      const found = doc.clients.find((c) => c.clientId === clientId);
      return found ? (found.clientJson as unknown as OAuthClientInformationFull) : undefined;
    });
  }

  async registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">,
    allowedRedirectHosts: string[],
  ): Promise<OAuthClientInformationFull> {
    return this.locked(async () => {
      if (!client.redirect_uris.every((uri) => redirectHostAllowed(String(uri), allowedRedirectHosts))) {
        throw new InvalidRequestError("Client redirect_uri is not allowed for this chatgpt2codex server");
      }
      const doc = await this.load();
      const now = Math.floor(Date.now() / 1000);
      const registered: OAuthClientInformationFull = {
        ...client,
        client_id: `chatgpt2codex-${randomUUID()}`,
        client_id_issued_at: now,
        token_endpoint_auth_method: client.token_endpoint_auth_method ?? "none",
        grant_types: client.grant_types ?? ["authorization_code", "refresh_token"],
        response_types: client.response_types ?? ["code"],
      };
      doc.clients.push({
        clientId: registered.client_id,
        clientJson: registered as unknown as Record<string, unknown>,
        issuedAt: now,
      });
      await this.persist(doc);
      return registered;
    }, true);
  }

  async getAccessToken(tokenHash: string): Promise<PersistedAccessTokenRecord | undefined> {
    return this.locked(async () => {
      const doc = await this.load();
      const now = Math.floor(Date.now() / 1000);
      this.sweepExpired(doc, now);
      const found = doc.accessTokens.find((t) => t.tokenHash === tokenHash);
      return found
        ? { clientId: found.clientId, scopes: found.scopes, expiresAt: found.expiresAt, resource: found.resource }
        : undefined;
    });
  }

  async getRefreshToken(tokenHash: string): Promise<PersistedRefreshTokenRecord | undefined> {
    return this.locked(async () => {
      const doc = await this.load();
      const now = Math.floor(Date.now() / 1000);
      this.sweepExpired(doc, now);
      const found = doc.refreshTokens.find((t) => t.tokenHash === tokenHash);
      return found
        ? { clientId: found.clientId, scopes: found.scopes, expiresAt: found.expiresAt, resource: found.resource }
        : undefined;
    });
  }

  /**
   * Atomically persist a fresh access/refresh token pair, optionally
   * consuming (one-time-rotating) a prior refresh token hash. Returns false
   * (and persists nothing) if `consumedRefreshTokenHash` was provided but not
   * found — signals a replayed/already-rotated refresh token to the caller.
   */
  async saveTokenPair(pair: PersistedTokenPair, consumedRefreshTokenHash?: string): Promise<boolean> {
    return this.locked(async () => {
      const doc = await this.load();
      const now = Math.floor(Date.now() / 1000);
      this.sweepExpired(doc, now);

      if (consumedRefreshTokenHash) {
        const idx = doc.refreshTokens.findIndex((t) => t.tokenHash === consumedRefreshTokenHash);
        if (idx === -1) return false;
        doc.refreshTokens.splice(idx, 1);
      }

      doc.accessTokens = doc.accessTokens.filter((t) => t.tokenHash !== pair.accessTokenHash);
      doc.accessTokens.push({ tokenHash: pair.accessTokenHash, ...pair.accessToken });
      doc.refreshTokens = doc.refreshTokens.filter((t) => t.tokenHash !== pair.refreshTokenHash);
      doc.refreshTokens.push({ tokenHash: pair.refreshTokenHash, ...pair.refreshToken });

      await this.persist(doc);
      return true;
    }, true);
  }

  async deleteAccessToken(tokenHash: string): Promise<void> {
    await this.locked(async () => {
      const doc = await this.load();
      const before = doc.accessTokens.length;
      doc.accessTokens = doc.accessTokens.filter((t) => t.tokenHash !== tokenHash);
      if (doc.accessTokens.length !== before) await this.persist(doc);
    }, true);
  }

  async deleteRefreshToken(tokenHash: string): Promise<void> {
    await this.locked(async () => {
      const doc = await this.load();
      const before = doc.refreshTokens.length;
      doc.refreshTokens = doc.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
      if (doc.refreshTokens.length !== before) await this.persist(doc);
    }, true);
  }

  /** Guard sensitive lifecycle actions before changing the separate owner
   * token file. Never treats an unreadable or corrupt existing oauth.json
   * as empty and never mutates the OAuth document. */
  async assertReadable(): Promise<void> {
    await this.locked(async () => {
      await this.load();
    });
  }

  async clearAll(): Promise<void> {
    await this.locked(async () => {
      // Explicit token rotation still must not overwrite a damaged OAuth
      // store. Recover the damaged file privately before any reset.
      await this.load();
      await this.persist(emptyFile());
    }, true);
  }

  close(): void {
    // No open handles to release for the JSON-file backend; kept for
    // interface parity with a future sqlite/worker-backed store.
  }
}

/** Adapts JsonOAuthStore's client methods to the SDK's synchronous-looking
 * but actually-async-capable `OAuthRegisteredClientsStore` interface (the
 * SDK accepts either sync or Promise-returning implementations). */
export class JsonOAuthClientsStore implements OAuthRegisteredClientsStore {
  constructor(
    private readonly store: JsonOAuthStore,
    private readonly allowedRedirectHosts: string[],
  ) {}

  getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    return this.store.getClient(clientId);
  }

  registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">,
  ): Promise<OAuthClientInformationFull> {
    return this.store.registerClient(client, this.allowedRedirectHosts);
  }
}
