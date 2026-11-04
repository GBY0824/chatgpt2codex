// Disposable-only structural checks for the owner migration OAuth inspector.
// Never reads an installed MCP state path or discloses real client IDs/tokens.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

if (process.argv.length !== 3) throw Error("SYNTHETIC_BUILT_ROOT_REQUIRED");
const root = path.resolve(process.argv[2]);
const program = path.join(root, "scripts/inspect-oauth-state-readonly.mjs");
const temp = await mkdtemp(path.join(os.tmpdir(), "chatgpt2codex-oauth-migration-readonly-"));
const resource = "https://synthetic.example.test/mcp";
const oauthPath = path.join(temp, "oauth.json");
const syntheticClientId = "synthetic-only-reg-client";
const basic = {
  version: 1, updatedAt: 0, clients: [],
  accessTokens: [], refreshTokens: [],
};
function call() {
  const r = spawnSync(process.execPath, [program, temp, resource], {
    cwd: root, encoding: "utf8", timeout: 12000, windowsHide: true,
    maxBuffer: 64 * 1024,
  });
  assert.equal(r.error, undefined);
  assert.equal(r.stderr, "");
  const value = JSON.parse(r.stdout);
  assert.equal(value.sensitiveIdentifiersPrinted, false);
  assert.equal(value.realOwnerTokenValuesRead, false);
  assert.equal(value.dataModified, false);
  assert.equal(value.productionCutoverAuthorized, false);
  assert.equal(value.existingClientConnectionProven, false);
  assert(!r.stdout.includes(syntheticClientId));
  assert(!r.stdout.includes(temp));
  return { status: r.status, ...value };
}
try {
  await writeFile(path.join(temp, "owner-token.json"), JSON.stringify({
    version: 1, createdAt: 0, tokenHash: "A".repeat(43),
  }));
  await writeFile(oauthPath, JSON.stringify(basic));
  const beforeEmpty = await readFile(oauthPath, "utf8");
  const empty = call();
  assert.equal(empty.status, 1);
  assert.equal(empty.code, "AUTH_STATE_READONLY_NO_REGISTERED_CLIENTS");
  assert.equal(empty.hasRegisteredClients, false);
  assert.equal(await readFile(oauthPath, "utf8"), beforeEmpty);

  const existing = {
    ...basic,
    clients: [{
      clientId: syntheticClientId,
      clientJson: {
        client_id: syntheticClientId,
        redirect_uris: ["https://synthetic.example.test/callback"],
      },
      issuedAt: 0,
    }],
  };
  await writeFile(oauthPath, JSON.stringify(existing));
  const expected = await readFile(oauthPath, "utf8");
  const valid = call();
  assert.equal(valid.status, 0);
  assert.equal(valid.code, "AUTH_STATE_READONLY_STRUCTURAL_GATE_PASS");
  assert.equal(valid.hasRegisteredClients, true);
  assert.equal(valid.hasUnexpiredBasicAccessToken, false);
  assert.equal(valid.existingClientConnectionProven, false);
  assert.equal(await readFile(oauthPath, "utf8"), expected);

  const foreignResource = {
    ...existing,
    accessTokens: [{
      tokenHash: "B".repeat(43), clientId: syntheticClientId,
      scopes: ["chatgpt2codex"], expiresAt: Math.floor(Date.now() / 1000) + 3600,
      resource: "https://wrong.synthetic.example.test/mcp",
    }],
  };
  await writeFile(oauthPath, JSON.stringify(foreignResource));
  const foreign = call();
  assert.equal(foreign.status, 1);
  assert.equal(foreign.code, "AUTH_STATE_READONLY_MIGRATION_GATE_BLOCKED");
  assert.equal(foreign.allPersistedResourcesMatchPin, false);

  await writeFile(oauthPath, JSON.stringify({
    ...existing,
    clients: [{ ...existing.clients[0], clientJson: {
      client_id: "synthetic-mismatched-id",
      redirect_uris: ["https://synthetic.example.test/callback"],
    } }],
  }));
  const malformed = call();
  assert.equal(malformed.status, 1);
  assert.equal(malformed.code, "AUTH_STATE_READONLY_INVALID_RECORDS");

  console.log(JSON.stringify({
    code: "SYNTHETIC_OAUTH_READONLY_MIGRATION_CLIENTS_PASS",
    emptyClientMigrationsRejected: true,
    oneExistingClientAcceptedStructurallyOnly: true,
    issuerResourceMismatchRejected: true,
    mismatchedClientIdentityRejected: true,
    ownerStateRead: false,
    noCredentialsEmitted: true,
    dataModified: false,
    productionCutoverAuthorized: false,
  }));
} finally {
  assert(path.basename(temp).startsWith("chatgpt2codex-oauth-migration-readonly-"));
  await rm(temp, { recursive: true, force: true });
}
