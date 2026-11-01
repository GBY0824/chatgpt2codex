// Test only: actual compiled CLI against temporary, deliberately corrupt OAuth state.
// No production state, owner credentials, OS services, MCP port or browser involved.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (process.argv.length !== 3) throw Error('SYNTHETIC_ONLY_BUILT_ROOT_REQUIRED');
const root=path.resolve(process.argv[2]);
const cli=path.join(root,'dist','cli.js');
const ownerModule=await import(pathToFileURL(path.join(root,'dist','auth','owner-token.js')).href);
const sandbox=await mkdtemp(path.join(os.tmpdir(),'chatgpt2codex-corrupt-oauth-rotation-'));
const state=path.join(sandbox,'state');
const workspace=path.join(sandbox,'workspace');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fakeToken='FAKE_OWNER_TOKEN_TEST_ONLY_2026_NOT_REAL';
function cliRun(args,input) {
  const r=spawnSync(process.execPath,[cli,...args,'--isolated-state-dir',state],{
    cwd:workspace, input, encoding:'utf8',timeout:20000,windowsHide:true,
    env:{...process.env,CHATGPT2CODEX_CONTROL:'0'}
  });
  assert(!r.error,'SYNTHETIC_CLI_FAILED_TO_START');
  assert.notEqual(r.status,0,'SYNTHETIC_CORRUPT_OAUTH_CLI_WAS_ALLOWED');
  assert((r.stderr||'').includes('OAUTH_STORE_CORRUPT_REFUSE_WRITE'),
    'SYNTHETIC_WRONG_CLI_REJECTION_REASON:'+String(r.stderr).slice(0,300));
  assert(!(r.stderr||'').includes('generated a new HTTP owner token'),
    'SYNTHETIC_OWNER_TOKEN_PRINTED_BEFORE_GUARD');
}
try {
  await mkdir(state);
  await mkdir(workspace);
  await ownerModule.storeOwnerToken(state,fakeToken);
  const ownerFile=path.join(state,'owner-token.json');
  const oauthFile=path.join(state,'oauth.json');
  const corrupt='{"invalid":"oauth state, should never be erased"}';
  await writeFile(oauthFile,corrupt);
  const ownerBefore=digest(await readFile(ownerFile));
  const oauthBefore=digest(await readFile(oauthFile));
  cliRun(['owner-token','--generate']);
  cliRun(['owner-token','--set-stdin'],'SYNTHETIC_REPLACEMENT_TOKEN_ONLY_1234\n');
  cliRun(['init','--rotate-owner-token','--workspace',workspace]);
  assert.equal(digest(await readFile(ownerFile)),ownerBefore,'SYNTHETIC_OWNER_TOKEN_FILE_CHANGED');
  assert.equal(digest(await readFile(oauthFile)),oauthBefore,'SYNTHETIC_OAUTH_CORRUPTION_DESTROYED');
  assert.equal(await ownerModule.verifyOwnerToken(state,fakeToken),true);
  console.log(JSON.stringify({
    code:'CORRUPT_OAUTH_CLI_ROTATION_REFUSED_BEFORE_OWNER_HASH_CHANGE',
    testedCommands:['owner-token --generate','owner-token --set-stdin','init --rotate-owner-token'],
    ownerTokenUnchanged:true,oauthFileUnchanged:true,realOwnerStateRead:false,
    productionAffected:false
  }));
} finally {
  assert(path.basename(sandbox).startsWith('chatgpt2codex-corrupt-oauth-rotation-'));
  await rm(sandbox,{recursive:true,force:true});
}
