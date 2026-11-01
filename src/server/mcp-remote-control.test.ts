import { createServer as createNodeServer, type Server } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { execFileSync } from "node:child_process";
import { createServer as createHttpsServer, request as httpsRequest } from "node:https";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { storeOwnerToken } from "../auth/owner-token.js";
import type { ToolContext } from "../types.js";
import { createHttpServer, defaultHttpServerConfig } from "./http.js";

/**
 * End-to-end proof (real MCP-over-HTTP client, real OAuth token) that
 * src/server/http.ts marks a `/mcp` session `remote: true`
 * (createMcpServer({ ...ctx, remote: true })) and that
 * src/server/tools.ts's project_select handler refuses preset=control for a
 * remote session — i.e. lease arming (and kill-switch resumption, which only
 * a fresh control grant can do) stays local-only (stdio) even once the
 * desktop-control tools are exposed to ChatGPT.
 */

const OWNER_TOKEN = "unit-test-owner-token-mcp-remote";

function base64Url(bytes: Buffer): string {
  return bytes.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function randomPkceVerifier(): string {
  return base64Url(randomBytes(32));
}

function pkceChallenge(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

async function getFreePort(): Promise<number> {
  const server = createNodeServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  return port;
}

function makeCtx(stateDir: string, projectRoot: string): ToolContext {
  const registry = [{ projectId: "proj", name: "proj", root: projectRoot, aliases: [] }];
  let currentSession: unknown = { activeProjectId: null, mode: "observe", lease: null };
  return {
    workspaceRoot: path.dirname(projectRoot),
    stateDir,
    registry,
    ledger: { append: async () => undefined },
    store: {
      loadProjects: async () => registry,
      saveProjects: async () => undefined,
      getSession: async () => currentSession,
      setSession: async (next) => {
        currentSession = next;
      },
    },
    config: {
      workspaceRoot: path.dirname(projectRoot),
      stateDir,
      maxReadBytes: 10 * 1024 * 1024,
      maxPatchBytes: 10 * 1024 * 1024,
      defaultCommandTimeoutSec: 30,
      defaultLeaseTtlMs: 30 * 60 * 1000,
    },
  };
}

async function startApp(ctx: ToolContext): Promise<{ baseUrl: string; stop(): Promise<void> }> {
  const port = await getFreePort();
  const running = createHttpServer(ctx, defaultHttpServerConfig({ host: "127.0.0.1", port, publicUrl: `http://127.0.0.1:${port}` }));
  const server: Server = running.app.listen(port, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async stop() {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      running.close();
    },
  };
}

async function registerOAuthClient(baseUrl: string): Promise<{ clientId: string; redirectUri: string }> {
  const redirectUri = "https://chatgpt.com/aip/gpt/oauth/callback";
  const res = await fetch(`${baseUrl}/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: "ChatGPT",
    }),
  });
  const body = (await res.json()) as { client_id?: string };
  return { clientId: String(body.client_id), redirectUri };
}

async function getMcpAccessToken(baseUrl: string, scopes = "chatgpt2codex"): Promise<string> {
  const client = await registerOAuthClient(baseUrl);
  const verifier = randomPkceVerifier();
  const url = new URL("/authorize", baseUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", client.clientId);
  url.searchParams.set("redirect_uri", client.redirectUri);
  url.searchParams.set("code_challenge", pkceChallenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", "unit-test-state");
  url.searchParams.set("resource", `${baseUrl}/mcp`);

  const pageRes = await fetch(url, { headers: { origin: "https://chatgpt.com" } });
  const page = await pageRes.text();
  const csrfToken = page.match(/name="csrf_token" value="([^"]+)"/u)?.[1];

  const body = new URLSearchParams(url.searchParams);
  body.set("csrf_token", String(csrfToken));
  body.set("owner_token", OWNER_TOKEN);

  const authRes = await fetch(`${baseUrl}/authorize`, {
    method: "POST",
    headers: { origin: "https://chatgpt.com", "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    redirect: "manual",
  });
  const redirectUrl = new URL(String(authRes.headers.get("location")));
  const code = String(redirectUrl.searchParams.get("code"));

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: client.clientId,
    redirect_uri: client.redirectUri,
    code,
    code_verifier: verifier,
    resource: `${baseUrl}/mcp`,
  });
  const tokenRes = await fetch(`${baseUrl}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) throw new Error(`token exchange failed: ${JSON.stringify(tokenJson)}`);
  return tokenJson.access_token;
}

async function connectMcpClient(baseUrl: string, accessToken: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: { headers: { authorization: `Bearer ${accessToken}` } },
  });
  const client = new Client({ name: "unit-test-remote-client", version: "0.0.0" });
  await client.connect(transport);
  return client;
}

describe("remote MCP session (/mcp, how ChatGPT connects) marks ctx.remote", () => {
  let stateDir: string;
  let projectRoot: string;
  let stop: (() => Promise<void>) | undefined;
  let client: Client | undefined;

  beforeEach(async () => {
    stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "chatgpt2codex-mcp-remote-"));
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chatgpt2codex-mcp-remote-project-"));
    await storeOwnerToken(stateDir, OWNER_TOKEN);
  });

  afterEach(async () => {
    delete process.env.CHATGPT2CODEX_CONTROL_CHATGPT;
    await client?.close().catch(() => undefined);
    client = undefined;
    await stop?.();
    stop = undefined;
    await fs.rm(stateDir, { recursive: true, force: true });
    await fs.rm(projectRoot, { recursive: true, force: true });
  }, 15_000);

  it("rejects project_select preset=control over /mcp, even with the ChatGPT-confirm exposure flag on", async () => {
    process.env.CHATGPT2CODEX_CONTROL_CHATGPT = "1";
    const ctx = makeCtx(stateDir, projectRoot);
    const app = await startApp(ctx);
    stop = app.stop;

    const token = await getMcpAccessToken(app.baseUrl);
    client = await connectMcpClient(app.baseUrl, token);

    const result = (await client.callTool({
      name: "project_select",
      arguments: { projectId: "proj", reason: "remote self-grant attempt", preset: "control" },
    })) as { isError?: boolean; structuredContent?: { code?: string } };

    expect(result.isError).toBe(true);
    expect(result.structuredContent?.code).toBe("PERMISSION_DENIED");

    const session = (await ctx.store.getSession()) as { lease?: { preset?: string } | null } | null;
    expect(session?.lease?.preset ?? null).not.toBe("control");
  }, 20_000);

  it("still allows a normal preset (full-write) over the same /mcp session", async () => {
    const ctx = makeCtx(stateDir, projectRoot);
    const app = await startApp(ctx);
    stop = app.stop;

    const token = await getMcpAccessToken(app.baseUrl);
    client = await connectMcpClient(app.baseUrl, token);

    const result = (await client.callTool({
      name: "project_select",
      arguments: { projectId: "proj", reason: "remote normal select", preset: "full-write" },
    })) as { isError?: boolean; structuredContent?: { lease?: { preset?: string } } };

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent?.lease?.preset).toBe("full-write");
  }, 20_000);
  it("enforces OAuth goal scope through the real HTTP MCP transport and fences stale ON", async () => {
    const ctx = makeCtx(stateDir, projectRoot);
    const app = await startApp(ctx);
    stop = app.stop;

    // A previously authorized basic-scope client is still allowed to use
    // existing tools but must NOT control the distinct APP GOAL intent.
    const defaultToken = await getMcpAccessToken(app.baseUrl);
    client = await connectMcpClient(app.baseUrl, defaultToken);
    const oldScope = (await client.callTool({
      name: "goal_app_command",
      arguments: { action: "ON", expectedRevision: 0 },
    })) as { isError?: boolean; structuredContent?: { code?: string }; _meta?: Record<string, unknown> };
    expect(oldScope.isError).toBe(true);
    expect(oldScope.structuredContent?.code).toBe("APP_GOAL_OAUTH_SCOPE_OR_AUTH_MISSING");
    expect(oldScope._meta?.["mcp/www_authenticate"]).toEqual(expect.arrayContaining([
      expect.stringContaining('error="insufficient_scope"'),
    ]));
    expect(oldScope._meta?.["mcp/www_authenticate"]).toEqual(expect.arrayContaining([
      expect.stringContaining('scope="chatgpt2codex chatgpt2codex.goal"'),
    ]));
    await client.close();
    client = undefined;

    // Explicit owner-approved additional OAuth scope: server-verified
    // authInfo, not owner identity fields supplied as model tool inputs.
    const goalToken = await getMcpAccessToken(
      app.baseUrl, "chatgpt2codex chatgpt2codex.goal",
    );
    client = await connectMcpClient(app.baseUrl, goalToken);
    const status = (await client.callTool({
      name: "goal_app_command", arguments: { action: "status" },
    })) as { isError?: boolean; structuredContent?: Record<string, unknown> };
    expect(status.isError).toBeFalsy();
    expect(status.structuredContent).toMatchObject({
      code: "APP_GOAL_INTENT_STATUS_ONLY", requestedMode: "OFF",
      revision: 0, researchExecutionAuthorized: false, effectsIssued: 0,
    });
    const on = (await client.callTool({
      name: "goal_app_command",
      arguments: { action: "ON", expectedRevision: 0 },
    })) as { isError?: boolean; structuredContent?: Record<string, unknown> };
    expect(on.isError).toBeFalsy();
    expect(on.structuredContent).toMatchObject({
      code: "APP_GOAL_INTENT_RECORDED_ONLY", requestedMode: "ON",
      revision: 1, researchExecutionAuthorized: false,
      originalChatTurnAttested: false, effectsIssued: 0,
    });
    const off = (await client.callTool({
      name: "goal_app_command", arguments: { action: "OFF" },
    })) as { isError?: boolean; structuredContent?: Record<string, unknown> };
    expect(off.structuredContent).toMatchObject({
      code: "APP_GOAL_INTENT_RECORDED_ONLY", requestedMode: "OFF",
      revision: 2, researchExecutionAuthorized: false, effectsIssued: 0,
    });
    const staleOn = (await client.callTool({
      name: "goal_app_command",
      arguments: { action: "ON", expectedRevision: 1 },
    })) as { isError?: boolean; structuredContent?: Record<string, unknown> };
    expect(staleOn.structuredContent).toMatchObject({
      code: "APP_GOAL_REVISION_STALE", requestedMode: "OFF",
      researchExecutionAuthorized: false, effectsIssued: 0,
    });
  }, 25_000);

  it("rechecks per-request OAuth scope when a low-scope bearer reuses a GOAL-scoped MCP session", async () => {
    const ctx = makeCtx(stateDir, projectRoot);
    const app = await startApp(ctx);
    stop = app.stop;

    const goalToken = await getMcpAccessToken(app.baseUrl, "chatgpt2codex chatgpt2codex.goal");
    const basicToken = await getMcpAccessToken(app.baseUrl, "chatgpt2codex");
    const transport = new StreamableHTTPClientTransport(new URL(app.baseUrl + "/mcp"), {
      requestInit: { headers: { authorization: "Bearer " + goalToken } },
    });
    client = new Client({ name: "per-request-scope-regression", version: "0.0.0" });
    await client.connect(transport);
    const sessionId = transport.sessionId;
    expect(sessionId).toBeTruthy();

    const before = await client.callTool({
      name: "goal_app_command", arguments: { action: "status" },
    });
    expect(before.structuredContent).toMatchObject({ requestedMode: "OFF", revision: 0 });

    // The session was created with a GOAL-scoped owner token. A second
    // request carrying a basic-only bearer must not inherit that privilege.
    const response = await fetch(app.baseUrl + "/mcp", {
      method: "POST",
      headers: {
        authorization: "Bearer " + basicToken,
        "mcp-session-id": String(sessionId),
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 9731, method: "tools/call",
        params: { name: "goal_app_command", arguments: { action: "ON", expectedRevision: 0 } },
      }),
    });
    const raw = await response.text();
    const dataLines = raw.split(/\r?\n/u).filter((line) => /^data:\s*/u.test(line));
    const decoded = dataLines.length
      ? JSON.parse(dataLines[dataLines.length - 1]!.replace(/^data:\s*/u, ""))
      : raw.trim().startsWith("{") ? JSON.parse(raw) : null;
    const result = decoded?.result;
    expect(
      response.status === 401 ||
      (result?.isError === true &&
       result?.structuredContent?.code === "APP_GOAL_OAUTH_SCOPE_OR_AUTH_MISSING"),
    ).toBe(true);

    const after = await client.callTool({
      name: "goal_app_command", arguments: { action: "status" },
    });
    expect(after.structuredContent).toMatchObject({ requestedMode: "OFF", revision: 0 });
  }, 25_000);

  it("serves scoped OAuth metadata over CA-verified isolated HTTPS and denies anonymous MCP", async () => {
    // A temporary CA-trusted TLS listener exercises HTTPS origin, OAuth
    // discovery and bearer protection; this never contacts the user's Funnel.
    const certConfig = path.join(stateDir, "test-openssl.cnf");
    const certPath = path.join(stateDir, "test-cert.pem");
    const keyPath = path.join(stateDir, "test-key.pem");
    await fs.writeFile(certConfig, [
      "[req]", "distinguished_name=dn", "x509_extensions=v3_req", "prompt=no",
      "[dn]", "CN=localhost", "[v3_req]",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
      "basicConstraints=critical,CA:TRUE",
      "keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign,cRLSign",
      "extendedKeyUsage=serverAuth", "",
    ].join("\n"));
    execFileSync("openssl", [
      "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256",
      "-days", "1", "-keyout", keyPath, "-out", certPath,
      "-config", certConfig, "-extensions", "v3_req",
    ], { stdio: "ignore", timeout: 15_000 });
    const cert = await fs.readFile(certPath);
    const key = await fs.readFile(keyPath);
    const port = await getFreePort();
    const base = "https://127.0.0.1:" + port;
    const ctx = makeCtx(stateDir, projectRoot);
    const running = createHttpServer(ctx, defaultHttpServerConfig({
      host: "127.0.0.1", port, publicUrl: base,
    }));
    const tls = createHttpsServer({ cert, key }, running.app);
    await new Promise<void>((resolve) => tls.listen(port, "127.0.0.1", resolve));
    stop = async () => {
      await new Promise<void>((resolve) => tls.close(() => resolve()));
      running.close();
    };
    function secureRequest(endpoint: string, method = "GET", payload?: string): Promise<{
      status: number; body: string;
    }> {
      return new Promise((resolve, reject) => {
        const request = httpsRequest(base + endpoint, {
          method, ca: cert, rejectUnauthorized: true, agent: false,
          headers: {
            ...(payload === undefined ? {} : {
              "content-type": "application/json",
              "content-length": String(Buffer.byteLength(payload)),
              accept: "application/json, text/event-stream",
            }),
          },
        }, (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          }));
        });
        request.on("error", reject);
        request.setTimeout(10_000, () => request.destroy(new Error("TLS test request timed out")));
        request.end(payload);
      });
    }
    const discovery = await secureRequest("/.well-known/openid-configuration");
    expect(discovery.status).toBe(200);
    const metadata = JSON.parse(discovery.body) as {
      issuer: string; scopes_supported: string[];
    };
    expect(metadata.issuer).toBe(new URL(base).toString());
    expect(metadata.scopes_supported).toEqual(expect.arrayContaining([
      "chatgpt2codex", "chatgpt2codex.goal",
    ]));
    const unauthenticated = await secureRequest("/mcp", "POST", "{}");
    expect(unauthenticated.status).toBe(401);
  }, 30_000);

});
