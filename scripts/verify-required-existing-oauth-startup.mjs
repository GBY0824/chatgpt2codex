// CI-only real CLI preflight verification with disposable synthetic paths.
// Never points at installed original/stage MCP, OAuth credentials or sockets.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (process.argv.length !== 3) throw Error("SYNTHETIC_BUILT_ROOT_REQUIRED");
const builtRoot = path.resolve(process.argv[2]);
const temp = await mkdtemp(path.join(os.tmpdir(), "chatgpt2codex-existing-oauth-gate-"));
const syntheticState = path.join(temp, "never-initialized-state");
const cli = path.join(builtRoot, "dist", "cli.js");
const args = [
  cli, "serve", "--http", "--host", "127.0.0.1", "--port", "49321",
  "--public-url", "http://127.0.0.1:49321",
  "--isolated-state-dir", syntheticState,
];
function run(extra) {
  const result = spawnSync(process.execPath, [...args, ...extra], {
    cwd: builtRoot, encoding: "utf8", windowsHide: true, timeout: 12000,
    env: { ...process.env, CHATGPT2CODEX_CONTROL: "0" },
    maxBuffer: 1024 * 256,
  });
  assert.equal(result.error, undefined, "SYNTHETIC_CLI_UNEXPECTED_SPAWN_ERROR");
  assert.equal(result.status, 1, "SYNTHETIC_SERVER_MUST_EXIT_BEFORE_BIND");
  return { stdout: result.stdout, stderr: result.stderr };
}
async function assertNoStateFiles() {
  await assert.rejects(() => stat(syntheticState), { code: "ENOENT" });
}
try {
  const requiredMissing = run(["--require-existing-oauth-state"]);
  assert.match(requiredMissing.stderr, /OAUTH_STORE_READ_FAILED/);
  await assertNoStateFiles();

  const malformed = run(["--require-existing-oauth-state", "false"]);
  assert.match(malformed.stderr, /REQUIRE_EXISTING_OAUTH_FLAG_MUST_BE_BOOLEAN/);
  await assertNoStateFiles();

  const unsupportedTransport = spawnSync(process.execPath, [
    cli, "serve", "--stdio", "--isolated-state-dir", syntheticState,
    "--require-existing-oauth-state",
  ], {
    cwd: builtRoot, encoding: "utf8", windowsHide: true, timeout: 12000,
    env: { ...process.env, CHATGPT2CODEX_CONTROL: "0" },
  });
  assert.equal(unsupportedTransport.status, 1);
  assert.match(unsupportedTransport.stderr, /REQUIRE_EXISTING_OAUTH_REQUIRES_HTTP/);
  await assertNoStateFiles();

  // A normal initial installation must NOT turn the requirement on by
  // default. The no-owner-token refusal must also occur before project
  // registry, session or ledger data is written.
  const freshDefault = run([]);
  assert.match(freshDefault.stderr, /no owner token found/);
  await assertNoStateFiles();

  // A valid empty OAuth document is NOT a verified migrated enrollment.
  // Refuse it before owner-token lookup, writes or any socket bind.
  await mkdir(syntheticState, { recursive: true });
  const emptyDocument = JSON.stringify({
    version: 1, updatedAt: 0,
    clients: [], accessTokens: [], refreshTokens: [],
  });
  await writeFile(path.join(syntheticState, "oauth.json"), emptyDocument);
  const emptyMigration = run(["--require-existing-oauth-state"]);
  assert.match(emptyMigration.stderr, /OAUTH_REQUIRED_CLIENT_REGISTRATIONS_MISSING/);
  assert.equal(await readFile(path.join(syntheticState, "oauth.json"), "utf8"), emptyDocument);
  assert.deepEqual(await readdir(syntheticState), ["oauth.json"]);

  // An existing client registration is a necessary but INSUFFICIENT
  // continuity condition. The private owner's pinned client/issuer identity
  // must later be verified outside CI, without any token disclosure.
  const document = JSON.stringify({
    version: 1, updatedAt: 0,
    clients: [{
      clientId: "synthetic-owner-client-id",
      clientJson: { client_id: "synthetic-owner-client-id" },
      issuedAt: 0,
    }],
    accessTokens: [], refreshTokens: [],
  });
  await writeFile(path.join(syntheticState, "oauth.json"), document);
  const existingNoOwner = run(["--require-existing-oauth-state"]);
  assert.match(existingNoOwner.stderr, /no owner token found/);
  assert.equal(await readFile(path.join(syntheticState, "oauth.json"), "utf8"), document);
  assert.deepEqual(await readdir(syntheticState), ["oauth.json"]);

  console.log(JSON.stringify({
    code: "SYNTHETIC_REQUIRED_EXISTING_OAUTH_STARTUP_GATE_PASS",
    missingStateDeniedBeforeWrites: true,
    flagDowngradeDenied: true,
    stdioMisuseDenied: true,
    initialDefaultEnrollmentUnaffected: true,
    emptyClientRegistrationsRejected: true,
    existingOwnerTokenStillRequired: true,
    realOwnerStateRead: false,
    portOpened: false,
    productionCutoverAuthorized: false,
  }));
} finally {
  assert(path.basename(temp).startsWith("chatgpt2codex-existing-oauth-gate-"));
  await rm(temp, { recursive: true, force: true });
}
