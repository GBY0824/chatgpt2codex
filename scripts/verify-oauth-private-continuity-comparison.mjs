// Synthetic-only fixture of an actually executed read-only private OAuth
// baseline-vs-candidate comparison. Never uses original installed owner data.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

if (process.argv.length !== 3) throw Error("SYNTHETIC_ROOT_REQUIRED");
const root = path.resolve(process.argv[2]);
const tool = path.join(root, "scripts/compare-oauth-state-readonly.mjs");
const tmp = await mkdtemp(path.join(os.tmpdir(), "chatgpt2codex-oauth-private-compare-"));
const original = path.join(tmp, "synthetic-old"), copied = path.join(tmp, "synthetic-new");
const pin = "https://synthetic.example.test/mcp";
const clientId = "SYNTHETIC-SECRET-CLIENT-DO-NOT-OUTPUT";
const tokenHash = "A".repeat(43);
const owner = { version: 1, createdAt: 7, tokenHash: "B".repeat(43) };
const client = { clientId, clientJson: {
  client_id: clientId, redirect_uris: ["https://synthetic.example.test/return"],
}, issuedAt: 12 };
const token = { tokenHash, clientId, scopes: ["chatgpt2codex"],
  expiresAt: Math.floor(Date.now()/1000) + 3600, resource: pin };
const oauth = {
  version: 1, updatedAt: 21, clients: [client],
  accessTokens: [token], refreshTokens: [{ ...token, tokenHash: "C".repeat(43) }],
};
const filenames = ["owner-token.json", "oauth.json"];
async function writeBoth(dir, who = owner, tokens = oauth) {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filenames[0]), JSON.stringify(who));
  await writeFile(path.join(dir, filenames[1]), JSON.stringify(tokens));
}
function compare(a = original, b = copied, resource = pin) {
  const result = spawnSync(process.execPath, [tool, a, b, resource], {
    cwd: root, encoding: "utf8", windowsHide: true,
    timeout: 12000, maxBuffer: 100000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.stderr, "");
  assert(!result.stdout.includes(tmp));
  assert(!result.stdout.includes(clientId));
  assert(!result.stdout.includes(tokenHash));
  assert(!result.stdout.includes(owner.tokenHash));
  const response = JSON.parse(result.stdout);
  assert.equal(response.dataModified, false);
  assert.equal(response.credentialsOrIdentifiersPrinted, false);
  assert.equal(response.unredactedPathsPrinted, false);
  assert.equal(response.oldWriterQuiescenceVerified, false);
  assert.equal(response.externallyPinnedSnapshotVerified, false);
  assert.equal(response.existingChatGPTAuthorizationProven, false);
  assert.equal(response.productionCutoverAuthorized, false);
  return { status: result.status, ...response };
}
try {
  await writeBoth(original);
  await writeBoth(copied);
  const before = await Promise.all([original,copied].flatMap(
    dir => filenames.map(name => readFile(path.join(dir,name),"utf8"))
  ));
  const same = compare();
  assert.equal(same.status, 0);
  assert.equal(same.code, "OAUTH_PRIVATE_CONTINUITY_STRUCTURAL_MATCH");
  assert.equal(same.registeredClientSetMatches, true);
  assert.equal(same.refreshTokenRecordsMatch, true);
  assert.equal(same.ownerTokenRecordMatches, true);
  assert.equal(compare(original,original).status,1);
  assert.equal(compare(original,original).code,
    "OAUTH_PRIVATE_CONTINUITY_SAME_OR_NESTED_STATE_DENIED");

  await writeBoth(copied, owner, {...oauth, clients: [
    {...client, clientId: "SYNTHETIC-FOREIGN-CLIENT", clientJson:
      {...client.clientJson,client_id: "SYNTHETIC-FOREIGN-CLIENT"}} ],
    accessTokens: [], refreshTokens: [] });
  const changedClient = compare();
  assert.equal(changedClient.status, 1);
  assert.equal(changedClient.registeredClientSetMatches, false);

  await writeBoth(copied, owner, { ...oauth,
    refreshTokens: [{ ...oauth.refreshTokens[0], tokenHash:"D".repeat(43) }] });
  const changedRefresh = compare();
  assert.equal(changedRefresh.status, 1);
  assert.equal(changedRefresh.registeredClientSetMatches, true);
  assert.equal(changedRefresh.refreshTokenRecordsMatch, false);

  await writeBoth(copied, { ...owner, tokenHash: "E".repeat(43) }, oauth);
  const changedOwner = compare();
  assert.equal(changedOwner.status, 1);
  assert.equal(changedOwner.ownerTokenRecordMatches, false);

  await writeBoth(copied, owner, { ...oauth,
    accessTokens: [{ ...oauth.accessTokens[0],
      resource: "https://different.synthetic.example.test/mcp" }] });
  const foreignResource = compare();
  assert.equal(foreignResource.status, 1);
  assert.equal(foreignResource.persistedResourcesMatchPin, false);

  await writeBoth(copied, owner, {...oauth, clients:[]});
  const zeroClients = compare();
  assert.equal(zeroClients.status,1);
  assert.equal(zeroClients.code,"OAUTH_PRIVATE_CONTINUITY_RECORDS_INVALID");

  await writeBoth(copied);
  const unchanged = await Promise.all(filenames.map(
    name => readFile(path.join(original,name),"utf8")
  ));
  assert.deepEqual(unchanged, before.slice(0,2));
  assert.equal(compare().code,"OAUTH_PRIVATE_CONTINUITY_STRUCTURAL_MATCH");
  console.log(JSON.stringify({
    code:"SYNTHETIC_PRIVATE_OAUTH_CONTINUITY_COMPARISON_PASS",
    separateStateSnapshotsCompared:true,
    clientReplacementDenied:true,
    refreshTokenReplacementDenied:true,
    ownerTokenChangeDenied:true,
    foreignResourceDenied:true,
    emptyClientStateDenied:true,
    realOwnerStateRead:false,
    noPrivateIdentifiersPrinted:true,
    productionCutoverAuthorized:false,
  }));
} finally {
  assert(path.basename(tmp).startsWith("chatgpt2codex-oauth-private-compare-"));
  await rm(tmp,{recursive:true,force:true});
}
