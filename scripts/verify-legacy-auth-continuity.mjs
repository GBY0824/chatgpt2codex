// SOURCE-ONLY OAuth/owner-token continuity check across built legacy and candidate.
// Never reads real owner state: all token values and storage are synthetic.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (process.argv.length !== 4) {
  throw new Error('usage: node scripts/verify-legacy-auth-continuity.mjs <built-legacy> <built-fork>');
}
const roots=process.argv.slice(2).map(x=>path.resolve(x));
if (roots[0]===roots[1]) throw new Error('LEGACY_AND_CANDIDATE_ROOTS_MUST_DIFFER');
function hash(bytes){return createHash('sha256').update(bytes).digest('hex');}
async function importBuilt(root,sub){return import(pathToFileURL(path.join(root,'dist','auth',sub+'.js')).href);}
const [legacyStore, candidateStore, legacyOwner, candidateOwner]=await Promise.all([
  importBuilt(roots[0],'oauth-store'),
  importBuilt(roots[1],'oauth-store'),
  importBuilt(roots[0],'owner-token'),
  importBuilt(roots[1],'owner-token')
]);
const tmpRoot=await mkdtemp(path.join(os.tmpdir(),'chatgpt2codex-legacy-auth-contract-'));
const folder=path.join(tmpRoot,'synthetic-state');
const issuer='http://127.0.0.1:7979/mcp';
const now=Math.floor(Date.now()/1000);
const testOwnerSecret='ONLY_FAKE_OWNER_VALUE_NOT_USER_SECRET_12345';
try {
  const old=new legacyStore.JsonOAuthStore(folder);
  const originalOwner=await legacyOwner.storeOwnerToken(folder,testOwnerSecret);
  assert.equal(originalOwner,undefined);
  const fakeClient=await old.registerClient({
    client_name:'synthetic-legacy-browser',
    redirect_uris:['http://127.0.0.1:49173/callback'],
    token_endpoint_auth_method:'none',
    grant_types:['authorization_code','refresh_token'],
    response_types:['code'],
    scope:'chatgpt2codex'
  },[]);
  assert(fakeClient.client_id.startsWith('chatgpt2codex-'));
  const syntheticTokenValues={
    access:legacyStore.hashToken('synthetic-legacy-access-never-real'),
    refresh:legacyStore.hashToken('synthetic-legacy-refresh-never-real')
  };
  assert(await old.saveTokenPair({
    accessTokenHash:syntheticTokenValues.access,
    accessToken:{clientId:fakeClient.client_id,scopes:['chatgpt2codex'],expiresAt:now+3600,resource:issuer},
    refreshTokenHash:syntheticTokenValues.refresh,
    refreshToken:{clientId:fakeClient.client_id,scopes:['chatgpt2codex'],expiresAt:now+86400,resource:issuer}
  }));
  const before=hash(await readFile(path.join(folder,'oauth.json')));
  const ownerBefore=hash(await readFile(path.join(folder,'owner-token.json')));
  // Fresh candidate process-level store objects see the original stored records.
  const candidate=new candidateStore.JsonOAuthStore(folder);
  const observedClient=await candidate.getClient(fakeClient.client_id);
  assert.equal(observedClient?.client_id,fakeClient.client_id);
  const observedAccess=await candidate.getAccessToken(syntheticTokenValues.access);
  const observedRefresh=await candidate.getRefreshToken(syntheticTokenValues.refresh);
  assert.deepEqual(observedAccess?.scopes,['chatgpt2codex']);
  assert.deepEqual(observedRefresh?.scopes,['chatgpt2codex']);
  assert.equal(observedAccess?.resource,issuer);
  assert.equal(observedRefresh?.resource,issuer);
  assert.equal(observedAccess?.clientId,fakeClient.client_id);
  assert.equal(hash(await readFile(path.join(folder,'oauth.json'))),before);
  assert.equal(hash(await readFile(path.join(folder,'owner-token.json'))),ownerBefore);
  assert.equal(await candidateOwner.verifyOwnerToken(folder,testOwnerSecret),true);
  assert.equal(await candidateOwner.verifyOwnerToken(folder,'WRONG_SYNTHETIC_OWNER_VALUE'),false);
  // Legacy/basic credentials remain basic; the GOAL scope never materializes
  // just by upgrading the application or reading old stored records.
  assert(!observedAccess.scopes.includes('chatgpt2codex.goal'));
  assert(!observedRefresh.scopes.includes('chatgpt2codex.goal'));
  // Candidate rotates the synthetic refresh token. Old code must accept new
  // basic-token state and the consumed synthetic refresh must stay revoked.
  const rotated={
    access:candidateStore.hashToken('synthetic-candidate-access-never-real'),
    refresh:candidateStore.hashToken('synthetic-candidate-refresh-never-real')
  };
  assert.equal(await candidate.saveTokenPair({
    accessTokenHash:rotated.access,
    accessToken:{clientId:fakeClient.client_id,scopes:['chatgpt2codex'],expiresAt:now+3600,resource:issuer},
    refreshTokenHash:rotated.refresh,
    refreshToken:{clientId:fakeClient.client_id,scopes:['chatgpt2codex'],expiresAt:now+86400,resource:issuer}
  },syntheticTokenValues.refresh),true);
  const backwards=new legacyStore.JsonOAuthStore(folder);
  assert.equal(await backwards.getRefreshToken(syntheticTokenValues.refresh),undefined);
  assert.deepEqual((await backwards.getRefreshToken(rotated.refresh))?.scopes,['chatgpt2codex']);
  assert.equal((await backwards.getClient(fakeClient.client_id))?.client_id,fakeClient.client_id);
  assert.equal(await legacyOwner.verifyOwnerToken(folder,testOwnerSecret),true);
  const after=hash(await readFile(path.join(folder,'owner-token.json')));
  assert.equal(after,ownerBefore);
  // Neither app may silently widen existing legacy-token scopes.
  const oldByNew=await candidate.getAccessToken(syntheticTokenValues.access);
  assert.deepEqual(oldByNew?.scopes,['chatgpt2codex']);
  console.log(JSON.stringify({
    code:'LEGACY_AUTH_STATE_CROSS_VERSION_COMPAT_PASS',
    oldClientReadableByCandidate:true,
    basicScopesNotAutoEscalated:true,
    ownerTokenHashUnchanged:true,
    crossVersionRefreshRotation:true,
    candidateRefreshReadableByLegacy:true,
    issuerPreservedInSyntheticRecords:true,
    localSyntheticStateOnly:true,
    realUserStateRead:false,
    actualChatGPTClientReconnected:false,
    actualHostedOAuthReconsent:false,
    productionCutoverAuthorized:false
  }));
} finally {
  // Only the unique root generated in this process is cleaned.
  assert(path.basename(tmpRoot).startsWith('chatgpt2codex-legacy-auth-contract-'));
  await rm(tmpRoot,{recursive:true,force:true});
}
