import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonOAuthStore, hashToken, isVerifiedOAuthWriterContention, isRetryableWindowsOAuthOpenDenial } from "./oauth-store.js";

const REDIRECT = "http://127.0.0.1:49173/callback";
const basicClient = {
  client_name: "synthetic-client-only",
  redirect_uris: [REDIRECT],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "none" as const,
};
const now = Math.floor(Date.now() / 1000);
const pair = {
  accessTokenHash: hashToken("synthetic-access-token-1"),
  accessToken: { clientId: "synthetic", scopes: ["chatgpt2codex"], expiresAt: now + 3600 },
  refreshTokenHash: hashToken("synthetic-refresh-token-1"),
  refreshToken: { clientId: "synthetic", scopes: ["chatgpt2codex"], expiresAt: now + 3600 },
};

describe("OAuth store existing-state fail-closed recovery boundary", () => {
  let dir: string;
  let store: JsonOAuthStore;
  const oauthFile = () => join(dir, "oauth.json");

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "chatgpt2codex-oauth-failclosed-"));
    store = new JsonOAuthStore(dir);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("classifies Windows competing writer open errors only with a verified regular-file claim", () => {
    expect(isVerifiedOAuthWriterContention("EEXIST", "win32", false)).toBe(true);
    expect(isVerifiedOAuthWriterContention("EEXIST", "linux", false)).toBe(true);
    for (const errno of ["EACCES", "EPERM"]) {
      expect(isVerifiedOAuthWriterContention(errno, "win32", true)).toBe(true);
      expect(isVerifiedOAuthWriterContention(errno, "win32", false)).toBe(false);
      expect(isVerifiedOAuthWriterContention(errno, "linux", true)).toBe(false);
      expect(isVerifiedOAuthWriterContention(errno, "darwin", true)).toBe(false);
    }
    for (const errno of ["ENOENT", "EIO", "ENOSPC", "EROFS", undefined]) {
      expect(isVerifiedOAuthWriterContention(errno, "win32", true)).toBe(false);
    }
  });

  it("retries only Windows-exclusive-open EPERM/EACCES but never equates absent lock with owned claim", () => {
    for (const errno of ["EPERM", "EACCES"]) {
      expect(isRetryableWindowsOAuthOpenDenial(errno, "win32")).toBe(true);
      expect(isRetryableWindowsOAuthOpenDenial(errno, "linux")).toBe(false);
      expect(isRetryableWindowsOAuthOpenDenial(errno, "darwin")).toBe(false);
      expect(isVerifiedOAuthWriterContention(errno, "win32", false)).toBe(false);
    }
    for (const errno of ["EEXIST", "EIO", "ENOENT", "ENOSPC", "EROFS", undefined]) {
      expect(isRetryableWindowsOAuthOpenDenial(errno, "win32")).toBe(false);
    }
  });

  it("still allows first registration when oauth.json is truly absent", async () => {
    const client = await store.registerClient(basicClient, []);
    expect(client.client_id).toMatch(/^chatgpt2codex-/);
    const stored = await store.getClient(client.client_id);
    expect(stored?.client_id).toBe(client.client_id);
  });

  for (const [label, corrupt] of [
    ["invalid JSON", "{ this is not valid JSON"],
    ["incorrect schema", '{"version":1,"updatedAt":0,"clients":{},"accessTokens":[],"refreshTokens":[]}'],
    ["unsupported format version", '{"version":2,"updatedAt":0,"clients":[],"accessTokens":[],"refreshTokens":[]}'],
  ] as const) {
    it("refuses all reads/writes without touching " + label, async () => {
      await writeFile(oauthFile(), corrupt);
      const before = await readFile(oauthFile());
      await expect(store.getClient("synthetic")).rejects.toThrow("OAUTH_STORE_CORRUPT_REFUSE_WRITE");
      await expect(store.getAccessToken(pair.accessTokenHash)).rejects.toThrow("OAUTH_STORE_CORRUPT_REFUSE_WRITE");
      await expect(store.getRefreshToken(pair.refreshTokenHash)).rejects.toThrow("OAUTH_STORE_CORRUPT_REFUSE_WRITE");
      await expect(store.registerClient(basicClient, [])).rejects.toThrow("OAUTH_STORE_CORRUPT_REFUSE_WRITE");
      await expect(store.saveTokenPair(pair)).rejects.toThrow("OAUTH_STORE_CORRUPT_REFUSE_WRITE");
      await expect(store.deleteAccessToken(pair.accessTokenHash)).rejects.toThrow("OAUTH_STORE_CORRUPT_REFUSE_WRITE");
      await expect(store.deleteRefreshToken(pair.refreshTokenHash)).rejects.toThrow("OAUTH_STORE_CORRUPT_REFUSE_WRITE");
      await expect(store.assertReadable()).rejects.toThrow("OAUTH_STORE_CORRUPT_REFUSE_WRITE");
      await expect(store.clearAll()).rejects.toThrow("OAUTH_STORE_CORRUPT_REFUSE_WRITE");
      expect(await readFile(oauthFile())).toEqual(before);
    });
  }

  it("refuses an existing unreadable non-file rather than emptying it", async () => {
    await mkdir(oauthFile());
    await expect(store.registerClient(basicClient, [])).rejects.toThrow("OAUTH_STORE_READ_FAILED");
    await expect(store.clearAll()).rejects.toThrow("OAUTH_STORE_READ_FAILED");
  });

  it("refuses to unlink a writer claim that was modified by someone else", async () => {
    const markerPath = join(dir, "oauth-write.lock");
    const forged = JSON.stringify({ version: 1, pid: 9999999, nonce: "foreign-test-owner" });
    // Internal method is deliberately exercised only against a randomly
    // generated test folder. No real owner state or claim is accessed.
    const internal = store as unknown as {
      withWriterClaim(fn: () => Promise<void>): Promise<void>;
    };
    await expect(internal.withWriterClaim(async () => {
      // Same inode but different nonce: file identity ALONE is insufficient.
      await writeFile(markerPath, forged, "utf8");
    })).rejects.toThrow("OAUTH_WRITE_LOCK_OWNERSHIP_LOST");
    expect(await readFile(markerPath, "utf8")).toBe(forged);
    await expect(store.registerClient(basicClient, []))
      .rejects.toThrow("OAUTH_WRITE_LOCK_BUSY_OR_STALE");
    expect(await readFile(markerPath, "utf8")).toBe(forged);
  }, 20_000);

  it("a rejected operation does not poison the queue after explicit fixture repair", async () => {
    await writeFile(oauthFile(), "{invalid");
    await expect(store.registerClient(basicClient, [])).rejects.toThrow("OAUTH_STORE_CORRUPT_REFUSE_WRITE");
    // Synthetic fixture repair only. The application never performs this.
    await writeFile(oauthFile(), JSON.stringify({
      version: 1, updatedAt: 0, clients: [], accessTokens: [], refreshTokens: [],
    }));
    const client = await store.registerClient(basicClient, []);
    expect((await store.getClient(client.client_id))?.client_id).toBe(client.client_id);
  });
});
