// CI-ONLY TEST HARNESS: integrated lock, journal, rollback and Windows sharing.
// It never accepts a live install path, does not start/stop Windows services,
// and creates only marker-verified, disposable OS temporary fixtures.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PREFIX = 'chatgpt2codex-integrated-test-';
const MARKER = '.synthetic-only';
const CRASH = 73;
const DENIED = 74;
const SHA = (data) => createHash('sha256').update(data).digest('hex');
const has = async (p) => fs.lstat(p).then(() => true, e => { if (e.code === 'ENOENT') return false; throw e; });
const paths = root => Object.fromEntries(['installed','candidate','retired','backup','quarantine','state','journal.json','transaction.lock'].map(n => [n, path.join(root,n)]));
const err = code => { throw new Error(code); };
async function digest(root) {
  if (!await has(root)) return null;
  const rows = [];
  async function traverse(dir, prefix = '') {
    for (const name of (await fs.readdir(dir)).sort()) {
      const p = path.join(dir,name); const st = await fs.lstat(p);
      if (st.isSymbolicLink() || (!st.isFile() && !st.isDirectory())) err('UNSAFE_SYNTHETIC_ENTRY');
      const rel = prefix ? prefix + '/' + name : name;
      if (st.isDirectory()) await traverse(p, rel);
      else rows.push(rel + ':' + SHA(await fs.readFile(p)));
    }
  }
  await traverse(root);
  return SHA(rows.join('\n'));
}
async function makeFiles(root, obj) {
  for (const [filename, value] of Object.entries(obj)) {
    const p = path.join(root,filename);
    await fs.mkdir(path.dirname(p),{recursive:true}); await fs.writeFile(p,value);
  }
}
async function guardedRoot() {
  const root = process.env.SYNTHETIC_INTEGRATED_ROOT;
  const proof = process.env.SYNTHETIC_INTEGRATED_PROOF;
  if (!root || !proof || !path.isAbsolute(root)) err('SYNTHETIC_ROOT_NOT_AUTHORIZED');
  const resolved = await fs.realpath(root); const temp = await fs.realpath(os.tmpdir());
  if (path.dirname(resolved) !== temp || !path.basename(resolved).startsWith(PREFIX)) err('SYNTHETIC_NOT_DIRECT_TEMP_CHILD');
  if ((await fs.readFile(path.join(resolved,MARKER),'utf8')) !== proof) err('SYNTHETIC_PROOF_INVALID');
  return resolved;
}
async function journal(root, value) {
  const tempFile = path.join(root,'journal-writer.tmp');
  const handle = await fs.open(tempFile,'wx',0o600);
  try { await handle.writeFile(JSON.stringify(value)+'\n'); await handle.sync(); }
  finally { await handle.close(); }
  await fs.rename(tempFile, path.join(root,'journal.json'));
}
async function readJournal(root) {
  let v;
  try { v = JSON.parse(await fs.readFile(path.join(root,'journal.json'),'utf8')); }
  catch { err('JOURNAL_INVALID_OR_MISSING'); }
  if (Object.keys(v).sort().join(',') !== 'candidate,original,phase,state,version' ||
      v.version !== 1 || !['ready','retired','active'].includes(v.phase) ||
      ![v.original,v.candidate,v.state].every(s => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s))) err('JOURNAL_CORRUPT');
  return v;
}
async function acquire(root) {
  const file = paths(root)['transaction.lock'];
  const proof = randomBytes(16).toString('hex');
  let handle;
  try { handle = await fs.open(file,'wx',0o600); }
  catch(e) { if (e.code === 'EEXIST') err('TRANSACTION_ALREADY_OWNED_OR_STALE'); throw e; }
  try { await handle.writeFile(JSON.stringify({pid:process.pid,proof})); await handle.sync(); }
  finally { await handle.close(); }
  return async () => {
    let value;
    try { value = JSON.parse(await fs.readFile(file,'utf8')); }
    catch { err('TRANSACTION_LOCK_CORRUPTED_ON_RELEASE'); }
    if(value.pid !== process.pid || value.proof !== proof) err('TRANSACTION_OWNER_CHANGED');
    await fs.unlink(file);
  };
}
function abortAt(where) {
  if (process.env.SYNTHETIC_INTEGRATED_CRASH === where) {
    process.stdout.write('SYNTHETIC_ABORT_AT='+where+'\n');
    process.exit(CRASH);
  }
}
async function upgrade(root) {
  const f = paths(root);
  const release = await acquire(root);
  try {
    if (process.env.SYNTHETIC_INTEGRATED_HOLD === '1') {
      process.stdout.write('SYNTHETIC_LOCK_HELD\n');
      // Deliberate test owner process; parent terminates it, leaving a stale file.
      setInterval(()=>{},1000); // keep the synthetic child alive for contention
      await new Promise(()=>{});
    }
    const j = await readJournal(root);
    if(j.phase !== 'ready' || await digest(f.installed) !== j.original ||
       await digest(f.candidate) !== j.candidate ||
       await digest(f.backup) !== j.original ||
       await digest(f.state) !== j.state) err('UPGRADE_PREFLIGHT_FAILED');
    abortAt('before-retire');
    await fs.rename(f.installed,f.retired);
    abortAt('after-retire-before-journal');
    j.phase = 'retired'; await journal(root,j);
    abortAt('after-retire-journal');
    await fs.rename(f.candidate,f.installed);
    abortAt('after-activate-before-journal');
    j.phase = 'active'; await journal(root,j);
    abortAt('after-activate-journal');
    // Test succeeds with candidate active; synthetic parent checks and rolls back.
    process.stdout.write('SYNTHETIC_CANDIDATE_ACTIVE\n');
  } finally { await release(); }
}
async function recover(root) {
  const f = paths(root);
  const release = await acquire(root);
  try {
    const j = await readJournal(root);
    if (await digest(f.backup) !== j.original || await digest(f.state) !== j.state) err('RECOVERY_PROTECTED_BYTES_CHANGED');
    const prev = await digest(f.retired);
    const active = await digest(f.installed);
    const quarantine = await digest(f.quarantine);
    if (prev === null) {
      if (active !== j.original) err('RECOVERY_MISSING_ORIGINAL');
      process.stdout.write('SYNTHETIC_ALREADY_ORIGINAL\n'); return;
    }
    if (prev !== j.original) err('RECOVERY_RETIRED_CORRUPT');
    if (quarantine !== null && !(active === null && quarantine === j.candidate)) err('RECOVERY_QUARANTINE_UNEXPECTED');
    if (active !== null && active !== j.candidate) err('RECOVERY_FOREIGN_ACTIVE');
    if (active === j.candidate) {
      await fs.rename(f.installed,f.quarantine);
      abortAt('after-quarantine');
    }
    await fs.rename(f.retired,f.installed);
    abortAt('after-restore');
    if(await digest(f.installed) !== j.original) err('RECOVERY_RESTORE_MISMATCH');
    process.stdout.write('SYNTHETIC_RESTORED\n');
  } finally { await release(); }
}
function run(mode, fixture, {crash='', hold=false} = {}) {
  const r = spawnSync(process.execPath,[process.argv[1],'--'+mode],{
    encoding:'utf8',timeout:20000,windowsHide:true,
    env:{...process.env,SYNTHETIC_INTEGRATED_ROOT:fixture.root,
      SYNTHETIC_INTEGRATED_PROOF:fixture.proof,SYNTHETIC_INTEGRATED_CRASH:crash,
      SYNTHETIC_INTEGRATED_HOLD:hold?'1':'0'},
  });
  if(r.error) err('SYNTHETIC_CHILD_FAILED:'+r.error.code);
  return r;
}
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),PREFIX));
  const proof = randomBytes(22).toString('hex');
  await fs.writeFile(path.join(root,MARKER),proof);
  const f=paths(root);
  await makeFiles(f.installed,{'dist/cli.js':'original-install', 'launcher.cmd':'old-boot'});
  await makeFiles(f.candidate,{'dist/cli.js':'new-goal-app', 'launcher.cmd':'new-boot'});
  await makeFiles(f.state,{'owner-state.fixture':'not-a-real-token', 'startup.fixture':'still-original'});
  await fs.cp(f.installed,f.backup,{recursive:true,errorOnExist:true,force:false});
  const j={version:1,phase:'ready',original:await digest(f.installed),candidate:await digest(f.candidate),state:await digest(f.state)};
  await journal(root,j);
  return {root,proof,f,j};
}
async function cleanup(fx) {
  const resolved=await fs.realpath(fx.root),temp=await fs.realpath(os.tmpdir());
  assert.equal(path.dirname(resolved),temp); assert(path.basename(resolved).startsWith(PREFIX));
  assert.equal(await fs.readFile(path.join(resolved,MARKER),'utf8'),fx.proof);
  await fs.rm(resolved,{force:true,recursive:true});
}
async function clearStaleOnlyInTest(fx,exitedChild) {
  // There is intentionally NO production stale-lock recovery policy here.
  // The test supervisor proves its OWN child exited before removing a marker
  // inside its OWN random fixture, never an owner-PC lock or unknown lock.
  assert(exitedChild.pid>0 && exitedChild.status === CRASH,'SUPERVISOR_NO_CRASH_PROOF');
  const v=JSON.parse(await fs.readFile(fx.f['transaction.lock'],'utf8'));
  assert.equal(v.pid,exitedChild.pid,'SUPERVISOR_LOCK_OWNER_UNVERIFIED');
  assert(/^[0-9a-f]{32}$/.test(v.proof));
  await fs.unlink(fx.f['transaction.lock']);
}
async function oneCrash(label,point,recoverCrash=null) {
  const fx=await fixture();
  try {
    const aborted=run('upgrade',fx,{crash:point});
    assert.equal(aborted.status,CRASH,label+':upgrade did not stop');
    assert(aborted.stdout.includes('SYNTHETIC_ABORT_AT='+point));
    assert.equal(run('recover',fx).status,DENIED,'stale lock must deny');
    await clearStaleOnlyInTest(fx,aborted);
    if(recoverCrash) {
      const abortedRecovery=run('recover',fx,{crash:recoverCrash});
      assert.equal(abortedRecovery.status,CRASH,'recover did not crash');
      assert.equal(run('upgrade',fx).status,DENIED,'stale recover lock must deny');
      await clearStaleOnlyInTest(fx,abortedRecovery);
    }
    assert.equal(run('recover',fx).status,0,label+':recovery failure');
    assert.equal(await digest(fx.f.installed),fx.j.original);
    assert.equal(await digest(fx.f.state),fx.j.state);
    assert.equal(await digest(fx.f.retired),null);
    assert.equal(run('recover',fx).status,0,label+':second recovery failure');
    console.log('SYNTHETIC_INTEGRATED_CASE_PASS='+label);
  } finally { await cleanup(fx); }
}
async function concurrency() {
  const fx=await fixture();
  let proc;
  try {
    proc=spawn(process.execPath,[process.argv[1],'--upgrade'],{
      env:{...process.env,SYNTHETIC_INTEGRATED_ROOT:fx.root,SYNTHETIC_INTEGRATED_PROOF:fx.proof,
        SYNTHETIC_INTEGRATED_HOLD:'1'},stdio:['ignore','pipe','pipe'],windowsHide:true});
    const ready=await new Promise((resolve,reject)=>{
      let data='';let timer=setTimeout(()=>reject(new Error('OWNER_LOCK_TIMEOUT')),5000);
      proc.stdout.on('data',chunk=>{data+=chunk.toString();if(data.includes('SYNTHETIC_LOCK_HELD')){clearTimeout(timer);resolve(true);}});
      proc.on('exit',()=>{clearTimeout(timer);reject(new Error('OWNER_EXITED_EARLY'));});
    });assert(ready);
    assert.equal(run('upgrade',fx).status,DENIED);
    assert.equal(run('recover',fx).status,DENIED);
    assert.equal(await digest(fx.f.installed),fx.j.original);
    assert.equal(await digest(fx.f.state),fx.j.state);
    proc.kill();
    const dead=await new Promise(resolve=>proc.once('exit',()=>resolve(true)));
    assert(dead);
    const stale=JSON.parse(await fs.readFile(fx.f['transaction.lock'],'utf8'));
    assert.equal(stale.pid,proc.pid);
    assert.equal(run('recover',fx).status,DENIED);
    // No stale-lock clear in a production controller. In CI synthetic fixture
    // the supervisor knows this PID died, but leaves it for isolated cleanup.
    console.log('SYNTHETIC_INTEGRATED_CASE_PASS=concurrent-upgrade-recover-and-stale-denial');
  } finally {if(proc && proc.exitCode===null)proc.kill();await cleanup(fx);}
}
async function foreignBytes() {
  const fx=await fixture();
  try {
    const killed=run('upgrade',fx,{crash:'after-activate-journal'});
    assert.equal(killed.status,CRASH);
    await clearStaleOnlyInTest(fx,killed);
    await fs.writeFile(path.join(fx.f.installed,'dist/cli.js'),'foreign-installed-bytes');
    assert.equal(run('recover',fx).status,DENIED);
    assert.equal(await digest(fx.f.retired),fx.j.original);
    assert.equal(await digest(fx.f.state),fx.j.state);
    console.log('SYNTHETIC_INTEGRATED_CASE_PASS=foreign-bytes-fail-closed');
  } finally{await cleanup(fx);}
}
async function windowsSharing() {
  if(process.platform!=='win32'){
    console.log('SYNTHETIC_INTEGRATED_CASE_SKIPPED=windows-share-lock-not-on-this-platform');
    return false;
  }
  const fx=await fixture();let blocker;
  try {
    // A short-lived independent PowerShell child holds a truly exclusive
    // Windows kernel file handle; no permission policy changes or bypass.
    const code = '$path=$args[0];$stream=[System.IO.File]::Open($path,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::None);try{[Console]::Out.WriteLine("SYNTHETIC_WINDOWS_LOCK_HELD");[Console]::Out.Flush();Start-Sleep -Seconds 20}finally{$stream.Dispose()}';
    const target=path.join(fx.f.installed,'dist/cli.js');
    blocker=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',code,target],{
      stdio:['pipe','pipe','pipe'],windowsHide:true});
    await new Promise((resolve,reject)=>{
      let output='';let timer=setTimeout(()=>reject(new Error('FILESHARE_OWNER_TIMEOUT')),8000);
      blocker.stdout.on('data',b=>{output+=b.toString();if(output.includes('SYNTHETIC_WINDOWS_LOCK_HELD')){clearTimeout(timer);resolve();}});
      blocker.once('exit',()=>{clearTimeout(timer);reject(new Error('FILESHARE_CHILD_EXITED_EARLY'));});
    });
    assert.equal(blocker.exitCode, null, 'WINDOWS_LOCK_HOLDER_EXITED_BEFORE_PROBE');
    let deniedRead = false;
    try { await fs.readFile(target); }
    catch (error) { deniedRead = ['EACCES','EPERM','EBUSY'].includes(error.code); }
    assert(deniedRead, 'WINDOWS_FILESHARE_KERNEL_READ_WAS_NOT_DENIED');
    const denied=run('upgrade',fx);
    assert.equal(denied.status,DENIED,'Windows share-lock did not deny upgrade');
    assert.equal(await digest(fx.f.state),fx.j.state);
    assert.equal(await has(fx.f.retired),false,'Original moved while locked');
    blocker.kill();
    if (blocker.exitCode === null) await new Promise(resolve=>blocker.once('exit',resolve));
    assert.equal(run('upgrade',fx).status,0,'Upgrade did not work after FileShare release');
    assert.equal(run('recover',fx).status,0,'Rollback did not work after FileShare release');
    assert.equal(await digest(fx.f.installed),fx.j.original);
    console.log('SYNTHETIC_INTEGRATED_CASE_PASS=windows-file-share-block-and-release');
    return true;
  }finally{if(blocker && blocker.exitCode===null)blocker.kill();await cleanup(fx);}
}
async function main(){
  if(process.argv.length>2){
    if(process.argv.length!==3 || !['--upgrade','--recover'].includes(process.argv[2]))err('NO_ARBITRARY_INSTALL_PATHS');
    const root=await guardedRoot();
    if(process.argv[2]==='--upgrade')await upgrade(root);else await recover(root);
    return;
  }
  await concurrency();
  const points=['before-retire','after-retire-before-journal','after-retire-journal','after-activate-before-journal','after-activate-journal'];
  for(const point of points) await oneCrash('transaction-'+point,point);
  await oneCrash('recovery-interrupted-after-quarantine','after-activate-journal','after-quarantine');
  await oneCrash('recovery-interrupted-after-restore','after-activate-journal','after-restore');
  await foreignBytes();
  const windowsTested=await windowsSharing();
  console.log(JSON.stringify({code:'SYNTHETIC_INTEGRATED_TRANSACTION_RECOVERY_PASS',casesPassed:9+(windowsTested?1:0),
    actualWindowsFileShareTested:windowsTested,
    crashProcessAndLockCombined:true,realInstalledAppTouched:false,
    ownerStateRead:false,productionInstallerAvailable:false,realPowerLossTested:false}));
}
main().catch(e=>{console.error('SYNTHETIC_INTEGRATED_FAILURE='+String(e.message).slice(0,500));process.exitCode=DENIED;});