// CI-only cross-PROCESS OAuth writer-lock test using fake clients and a
// newly generated OS-temp directory. Never points at an installed MCP state.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const builtRoot = path.resolve(process.argv[2]||'');
if(process.argv.length<3)throw Error('BUILT_ROOT_REQUIRED');
const { JsonOAuthStore } = await import(pathToFileURL(path.join(builtRoot,'dist/auth/oauth-store.js')).href);
const marker='chatgpt2codex-oauth-writer-process-';
const clientsPerWorker=8;
const workers=3;
const clientSpec=(i,j)=>({
  client_name:'synthetic-writer-'+i+'-'+j,
  redirect_uris:['http://127.0.0.1:49173/callback'],
  grant_types:['authorization_code','refresh_token'],
  response_types:['code'],
  token_endpoint_auth_method:'none'
});
const clientDigest=b=>createHash('sha256').update(b).digest('hex');
if(process.argv[3]==='--worker') {
  const dir=process.argv[4];
  const worker=Number(process.argv[5]);
  if(!dir || !path.isAbsolute(dir)||!path.basename(path.dirname(dir)).startsWith(marker) ||
     !Number.isSafeInteger(worker)||worker<0||worker>workers)throw Error('SYNTHETIC_WORKER_ARGUMENT_DENIED');
  const store=new JsonOAuthStore(dir);
  for(let k=0;k<clientsPerWorker;k++) {
    await store.registerClient(clientSpec(worker,k),[]);
  }
  console.log('SYNTHETIC_OAUTH_WRITER_FINISHED');
} else {
  if(process.argv.length!==3)throw Error('SYNTHETIC_UNEXPECTED_ARGUMENTS');
  const temp=await mkdtemp(path.join(os.tmpdir(),marker));
  const dir=path.join(temp,'oauth-fake-only');
  function run(worker){
    return new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[process.argv[1],builtRoot,'--worker',dir,String(worker)],{
        stdio:['ignore','pipe','pipe'],encoding:'utf8',windowsHide:true
      });
      let out='',err='';
      child.stdout.on('data',c=>{out+=c.toString().slice(0,1000)});
      child.stderr.on('data',c=>{err+=c.toString().slice(0,1000)});
      child.once('error',reject);
      child.once('close',(code)=>{
        if(worker<workers&&code!==0)reject(Error('SYNTHETIC_WRITER_EXIT_'+code+':'+err.slice(0,250)));
        else resolve({code,out,err});
      });
    });
  }
  try {
    const done=await Promise.all(Array.from({length:workers},(_,i)=>run(i)));
    assert(done.every(x=>x.out.includes('SYNTHETIC_OAUTH_WRITER_FINISHED')));
    const bytes=await readFile(path.join(dir,'oauth.json'));
    const doc=JSON.parse(bytes.toString('utf8'));
    assert.equal(doc.clients.length,workers*clientsPerWorker,'LOST_CROSS_PROCESS_CLIENT');
    assert.equal(new Set(doc.clients.map(x=>x.clientId)).size,workers*clientsPerWorker);
    const lockPath=path.join(dir,'oauth-write.lock');
    await assert.rejects(()=>stat(lockPath),{code:'ENOENT'});
    // Crash/stale-lock simulation: another process left the claim file.
    // New writers MUST NOT reclaim it without owner investigation.
    const stale='{"version":1,"pid":9999999,"createdAt":0}';
    await writeFile(lockPath,stale,{flag:'wx',mode:0o600});
    const before=clientDigest(bytes);
    const rejected=await run(workers);
    assert.notEqual(rejected.code,0);
    assert(rejected.err.includes('OAUTH_WRITE_LOCK_BUSY_OR_STALE'),
      'WRITER_FAILED_FOR_UNEXPECTED_REASON');
    assert.equal(clientDigest(await readFile(path.join(dir,'oauth.json'))),before);
    assert.equal(await readFile(lockPath,'utf8'),stale);
    console.log(JSON.stringify({
      code:'SYNTHETIC_OAUTH_CROSS_PROCESS_WRITER_EXCLUSION_PASS',
      clientsRetained:workers*clientsPerWorker,
      independentlySpawnedWriters:workers,
      staleLockRejected:true,
      staleLockAutoDeleted:false,
      actualLiveOwnerStateRead:false,
      legacyWriterAlsoHonorsLock:false,
      productionDeploymentApproved:false
    }));
  } finally {
    assert(path.basename(temp).startsWith(marker));
    await rm(temp,{recursive:true,force:true});
  }
}
