// Read-only, privacy-minimal comparison of two separately captured OAuth
// state roots. Never prints user paths, client IDs, token hashes or JSON.
// A PASS is NOT a production-cutover authorization or a quiescence receipt.
import assert from "node:assert/strict";
import { createHash, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const baseline = {
  code: "OAUTH_PRIVATE_CONTINUITY_UNVERIFIED",
  bothDocumentsValid: false, nonemptyRegisteredClients: false,
  registeredClientSetMatches: false, registeredClientDetailsMatch: false,
  ownerTokenRecordMatches: false, accessTokenRecordsMatch: false,
  refreshTokenRecordsMatch: false, persistedResourcesMatchPin: false,
  oldWriterQuiescenceVerified: false, externallyPinnedSnapshotVerified: false,
  productionCutoverAuthorized: false, dataModified: false,
  credentialsOrIdentifiersPrinted: false, unredactedPathsPrinted: false,
};
const emit = (patch = {}) => console.log(JSON.stringify({ ...baseline, ...patch }));
const fail = (code = "OAUTH_PRIVATE_CONTINUITY_UNVERIFIED") => {
  emit({ code }); process.exitCode = 1;
};
const args = process.argv.slice(2);
const hex43 = x => typeof x === "string" && /^[A-Za-z0-9_-]{43}$/.test(x);
const integer = x => Number.isSafeInteger(x) && x >= 0;
const record = x => x !== null && typeof x === "object" && !Array.isArray(x);
function stable(value) {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (record(value)) return "{" + Object.keys(value).sort().map(
    key => JSON.stringify(key) + ":" + stable(value[key])
  ).join(",") + "}";
  return JSON.stringify(value);
}
function equal(a, b) {
  const h1 = createHash("sha256").update(stable(a)).digest();
  const h2 = createHash("sha256").update(stable(b)).digest();
  return timingSafeEqual(h1, h2);
}
function sortedBy(items, key) {
  return [...items].sort((a, b) => String(a[key]).localeCompare(String(b[key]), "en"));
}
function validate(owner, oauth) {
  if (!record(owner) || owner.version !== 1 || !integer(owner.createdAt) ||
      !hex43(owner.tokenHash) || !record(oauth) ||
      oauth.version !== 1 || !integer(oauth.updatedAt) ||
      !Array.isArray(oauth.clients) || !Array.isArray(oauth.accessTokens) ||
      !Array.isArray(oauth.refreshTokens)) return false;
  const clients = oauth.clients;
  if (clients.length < 1 || clients.length > 100000 ||
      !clients.every(c => record(c) && typeof c.clientId === "string" &&
        c.clientId.length > 0 && record(c.clientJson) &&
        c.clientJson.client_id === c.clientId &&
        Array.isArray(c.clientJson.redirect_uris) &&
        c.clientJson.redirect_uris.every(x => typeof x === "string") &&
        integer(c.issuedAt)) ||
      new Set(clients.map(c => c.clientId)).size !== clients.length) return false;
  const idSet = new Set(clients.map(c => c.clientId));
  const tokens = [...oauth.accessTokens, ...oauth.refreshTokens];
  return tokens.length <= 200000 &&
    tokens.every(t => record(t) && hex43(t.tokenHash) &&
      idSet.has(t.clientId) && Array.isArray(t.scopes) &&
      t.scopes.every(s => typeof s === "string" && s.length > 0) &&
      integer(t.expiresAt) &&
      (t.resource === undefined || typeof t.resource === "string")) &&
    new Set(tokens.map(t => t.tokenHash)).size === tokens.length;
}
async function refuseSymlinkAncestors(file) {
  let at = path.resolve(file);
  for (;;) {
    const st = await fs.lstat(at);
    if (st.isSymbolicLink()) throw Error("REPARSE_PATH_BLOCKED");
    if (at === path.dirname(at)) break;
    at = path.dirname(at);
  }
}
async function load(dir, filename) {
  const file = path.join(dir, filename);
  await refuseSymlinkAncestors(file);
  const st = await fs.lstat(file);
  if (!st.isFile() || st.size > 16 * 1024 * 1024) throw Error("INVALID_FILE");
  const bytes = await fs.readFile(file);
  if (bytes.length > 16 * 1024 * 1024) throw Error("INVALID_FILE");
  const after = await fs.lstat(file);
  if (!after.isFile() || st.dev !== after.dev || st.ino !== after.ino ||
      st.size !== after.size || st.mtimeMs !== after.mtimeMs)
    throw Error("FILE_CHANGED_DURING_READ");
  return JSON.parse(bytes.toString("utf8"));
}
try {
  if (args.length !== 3 || !path.isAbsolute(args[0]) ||
      !path.isAbsolute(args[1])) {
    fail("OAUTH_PRIVATE_CONTINUITY_ABSOLUTE_PATHS_AND_RESOURCE_PIN_REQUIRED");
  } else {
    const resource = new URL(args[2]);
    const validResource = (resource.protocol === "https:" ||
      (resource.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(resource.hostname))) &&
      !resource.username && !resource.password && !resource.search &&
      !resource.hash && resource.pathname.endsWith("/mcp");
    if (!validResource) {
      fail("OAUTH_PRIVATE_CONTINUITY_RESOURCE_PIN_INVALID");
    } else {
      const [source, candidate] = await Promise.all(
        [args[0], args[1]].map(x => fs.realpath(x))
      );
      const overlaps = (a, b) => {
        const rel = path.relative(a, b);
        return rel === "" || (rel !== ".." &&
          !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel));
      };
      if (overlaps(source, candidate) || overlaps(candidate, source)) {
        fail("OAUTH_PRIVATE_CONTINUITY_SAME_OR_NESTED_STATE_DENIED");
      } else {
        const [ownerA, oauthA, ownerB, oauthB] = await Promise.all([
          load(source, "owner-token.json"), load(source, "oauth.json"),
          load(candidate, "owner-token.json"), load(candidate, "oauth.json"),
        ]);
        if (!validate(ownerA, oauthA) || !validate(ownerB, oauthB)) {
          fail("OAUTH_PRIVATE_CONTINUITY_RECORDS_INVALID");
        } else {
          const a = oauthA, b = oauthB;
          const resourcesMatch = [...a.accessTokens, ...a.refreshTokens,
            ...b.accessTokens, ...b.refreshTokens].every(t => t.resource === args[2]);
          const idMatch = equal(a.clients.map(c => c.clientId).sort(),
            b.clients.map(c => c.clientId).sort());
          const clientDetails = equal(sortedBy(a.clients, "clientId"),
            sortedBy(b.clients, "clientId"));
          const ownerMatch = equal(ownerA, ownerB);
          const accessMatch = equal(sortedBy(a.accessTokens, "tokenHash"),
            sortedBy(b.accessTokens, "tokenHash"));
          const refreshMatch = equal(sortedBy(a.refreshTokens, "tokenHash"),
            sortedBy(b.refreshTokens, "tokenHash"));
          const identical = resourcesMatch && idMatch && clientDetails &&
            ownerMatch && accessMatch && refreshMatch;
          emit({
            code: identical ? "OAUTH_PRIVATE_CONTINUITY_STRUCTURAL_MATCH" :
              "OAUTH_PRIVATE_CONTINUITY_MISMATCH_DENIED",
            bothDocumentsValid: true, nonemptyRegisteredClients: true,
            registeredClientSetMatches: idMatch,
            registeredClientDetailsMatch: clientDetails,
            ownerTokenRecordMatches: ownerMatch,
            accessTokenRecordsMatch: accessMatch,
            refreshTokenRecordsMatch: refreshMatch,
            persistedResourcesMatchPin: resourcesMatch,
          });
          if (!identical) process.exitCode = 1;
        }
      }
    }
  }
} catch {
  // Intentionally do not disclose filesystem paths, JSON, raw exceptions,
  // OAuth client IDs, issuer pin, user profiles or token hashes.
  fail();
}
