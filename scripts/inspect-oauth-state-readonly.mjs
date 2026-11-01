// Privacy-minimal READ-ONLY diagnostic for a persisted MCP OAuth state folder.
// Requires the owner to supply the exact state directory and expected MCP resource.
// Never prints client IDs, redirect URIs, owner token hashes, token values or paths.
// NEVER edits files and NEVER grants consent or upgrade rights.
import { promises as fs } from 'node:fs';
import path from 'node:path';

const args=process.argv.slice(2);
function result(code,extra={}){
  process.stdout.write(JSON.stringify({
    code, ownerTokenRecordValid:false, oauthDocumentValid:false,
    hasRegisteredClients:false, hasUnexpiredBasicAccessToken:false,
    allPersistedResourcesMatchPin:false, existingGoalScopeAccidentallyAdded:false,
    existingClientConnectionProven:false, goalScopeReconsentRequired:true,
    realOwnerTokenValuesRead:false, sensitiveIdentifiersPrinted:false,
    dataModified:false, productionCutoverAuthorized:false, ...extra
  })+'\n');
}
if(args.length!==2 || !path.isAbsolute(args[0])){
  result('AUTH_STATE_READONLY_ABSOLUTE_STATE_AND_RESOURCE_REQUIRED');
  process.exit(1);
}
const [stateDir,resourcePin]=args;
let endpoint;
try {
  endpoint=new URL(resourcePin);
  if (!['https:','http:'].includes(endpoint.protocol) ||
      endpoint.username || endpoint.password || endpoint.search ||
      endpoint.hash || !endpoint.pathname.endsWith('/mcp') ||
      (endpoint.protocol==='http:' && !['127.0.0.1','localhost','[::1]'].includes(endpoint.hostname))) {
    throw Error('invalid');
  }
} catch {
  result('AUTH_STATE_READONLY_RESOURCE_PIN_INVALID');
  process.exit(1);
}
async function safePath(p) {
  let cursor=path.resolve(p);
  while (true) {
    const stat=await fs.lstat(cursor);
    if (stat.isSymbolicLink()) throw Error('REPARSE_OR_SYMLINK_DENIED');
    const parent=path.dirname(cursor);
    if(parent===cursor)break;
    cursor=parent;
  }
}
async function load(name) {
  const p=path.join(stateDir,name);
  await safePath(p);
  const st=await fs.lstat(p);
  if(!st.isFile() || st.size>16*1024*1024)throw Error('MISSING_OR_TOO_LARGE');
  return JSON.parse(await fs.readFile(p,'utf8'));
}
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validHexHash=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{43}$/.test(x);
const validNatural=x=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0;
const validClient=x=>object(x)&&typeof x.clientId==='string'&&
  x.clientId.length>0&&object(x.clientJson)&&validNatural(x.issuedAt)&&
  x.clientJson.client_id===x.clientId&&Array.isArray(x.clientJson.redirect_uris)&&
  x.clientJson.redirect_uris.every(z=>typeof z==='string');
const validToken=x=>object(x)&&validHexHash(x.tokenHash)&&
  typeof x.clientId==='string'&&x.clientId.length>0&&
  Array.isArray(x.scopes)&&x.scopes.length>0&&
  x.scopes.every(s=>typeof s==='string'&&s.length>0)&&
  validNatural(x.expiresAt)&&
  (x.resource===undefined||typeof x.resource==='string');
try {
  const [owner,oauth]=await Promise.all([load('owner-token.json'),load('oauth.json')]);
  const ownerValid=object(owner)&&owner.version===1&&validNatural(owner.createdAt)&&validHexHash(owner.tokenHash);
  const docValid=object(oauth)&&oauth.version===1&&validNatural(oauth.updatedAt)&&
    Array.isArray(oauth.clients)&&oauth.clients.every(validClient)&&
    Array.isArray(oauth.accessTokens)&&oauth.accessTokens.every(validToken)&&
    Array.isArray(oauth.refreshTokens)&&oauth.refreshTokens.every(validToken);
  if(!ownerValid||!docValid) {
    result('AUTH_STATE_READONLY_INVALID_RECORDS',{
      ownerTokenRecordValid:!!ownerValid, oauthDocumentValid:!!docValid
    }); process.exit(1);
  }
  const ids=new Set(oauth.clients.map(c=>c.clientId));
  const allTokens=[...oauth.accessTokens,...oauth.refreshTokens];
  const allResourcesMatch=allTokens.every(t=>t.resource===resourcePin);
  const uniqueClients=ids.size===oauth.clients.length;
  const allTokenClientsValid=allTokens.every(t=>ids.has(t.clientId));
  const uniqueTokens=new Set(allTokens.map(t=>t.tokenHash)).size===allTokens.length;
  const now=Math.floor(Date.now()/1000);
  const legacyAccess=oauth.accessTokens.some(t=>t.expiresAt>now &&
    t.scopes.includes('chatgpt2codex') && t.resource===resourcePin);
  const goalPresent=allTokens.some(t=>t.scopes.includes('chatgpt2codex.goal'));
  const structural=uniqueClients&&uniqueTokens&&allTokenClientsValid;
  const code=structural&&allResourcesMatch?'AUTH_STATE_READONLY_STRUCTURAL_GATE_PASS':
    'AUTH_STATE_READONLY_MIGRATION_GATE_BLOCKED';
  result(code,{
    ownerTokenRecordValid:true,oauthDocumentValid:!!structural,
    hasRegisteredClients:oauth.clients.length>0,
    hasUnexpiredBasicAccessToken:legacyAccess,
    allPersistedResourcesMatchPin:allResourcesMatch,
    existingGoalScopeAccidentallyAdded:goalPresent,
  });
  if(code!=='AUTH_STATE_READONLY_STRUCTURAL_GATE_PASS')process.exit(1);
} catch {
  // Never include system errors, paths, JSON contents or identifying fields.
  result('AUTH_STATE_READONLY_MISSING_CORRUPT_OR_PATH_DENIED');
  process.exit(1);
}
