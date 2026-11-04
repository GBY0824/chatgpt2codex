// CI-only transaction ownership and Windows sharing checks. NOT an installer.
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PREFIX = 'chatgpt2codex-lock-fixture-';
const MARKER = '.synthetic-test-proof';
const BASE = await fs.realpath(os.tmpdir());
const ROOT = process.env.SYNTHETIC_TEST_ROOT;
const TOKEN = process.env.SYNTHETIC_TEST_PROOF;
const MODE = process.argv[2] ?? 'orchestrate';
const VALID_MODES = new Set(['orchestrate', 'owner', 'contend', 'recover']);
if (!VALID_MODES.has(MODE) || process.argv.length > (MODE === 'orchestrate' ? 2 : 3))
  throw new Error('SYNTHETIC_BAD_COMMAND');
function sha(b) { return createHash('sha256').update(b).digest('hex'); }
async function digest(root) {
  const entries = [];
  async function walk(dir, prefix = '') {
    for (const entry of (await fs.readdir(dir)).sort()) {
      const loc = path.join(dir, entry);
      const stat = await fs.lstat(loc);
      assert(!stat.isSymbolicLink(), 'SYNTHETIC_SYMLINK_DENIED');
      const key = prefix ? prefix + '/' + entry : entry;
      if (stat.isDirectory()) await walk(loc, key);
      else { assert(stat.isFile()); entries.push(key + ':' + sha(await fs.readFile(loc))); }
    }
  }
  await walk(root);
  return sha(entries.join('\n'));
}
async function verifyRoot(root, token) {
  if (typeof root !== 'string' || typeof token !== 'string' || !path.isAbsolute(root))
    throw new Error('SYNTHETIC_ROOT_NOT_PROVIDED');
  const real = await fs.realpath(root);
  if (path.dirname(real) !== BASE || !path.basename(real).startsWith(PREFIX))
    throw new Error('SYNTHETIC_ROOT_OUTSIDE_TEMP');
  if (await fs.readFile(path.join(real, MARKER), 'utf8') !== token)
    throw new Error('SYNTHETIC_MARKER_MISMATCH');
  return real;
}
async function acquire(root, token) {
  const lockPath = path.join(root, 'transaction.lock');
  let handle;
  try { handle = await fs.open(lockPath, 'wx', 0o600); }
  catch (e) {
    if (e?.code === 'EEXIST') throw new Error('SYNTHETIC_TRANSACTION_LOCK_BUSY');
    throw e;
  }
  const record = { kind: 'synthetic-only', proofHash: sha(token), ownerPid: process.pid };
  await handle.writeFile(JSON.stringify(record) + '\n');
  await handle.sync();
  return { handle, lockPath };
}
async function executeMode() {
  const root = await verifyRoot(ROOT, TOKEN);
  let lock;
  try { lock = await acquire(root, TOKEN); }
  catch (e) {
    if (e?.message === 'SYNTHETIC_TRANSACTION_LOCK_BUSY') {
      console.log('SYNTHETIC_TRANSACTION_LOCK_BUSY');
      process.exitCode = 77;
      return;
    }
    throw e;
  }
  if (MODE === 'owner') {
    console.log('SYNTHETIC_OWNER_LOCK_READY');
    process.stdin.setEncoding('utf8');
    await new Promise(resolve => process.stdin.once('data', resolve));
    await lock.handle.close();
    await fs.unlink(lock.lockPath);
    console.log('SYNTHETIC_OWNER_LOCK_RELEASED');
  } else {
    try {
      const file = path.join(root, 'installed', 'dist', 'cli.js');
      assert.equal(await fs.readFile(file, 'utf8'), 'synthetic-original');
      console.log('SYNTHETIC_CONTENDER_ACQUIRED=' + MODE);
    } finally {
      await lock.handle.close();
      await fs.unlink(lock.lockPath);
    }
  }
}
function runChild(root, token, mode) {
  const r = spawnSync(process.execPath, [process.argv[1], mode], {
    env: { ...process.env, SYNTHETIC_TEST_ROOT: root,
      SYNTHETIC_TEST_PROOF: token }, timeout: 10_000, encoding: 'utf8', windowsHide: true,
  });
  if (r.error) throw r.error;
  return r;
}
function waitLine(child, line, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = chunk => {
      buffer += String(chunk);
      if (buffer.includes(line)) { cleanup(); resolve(); }
    };
    const onClose = code => { cleanup(); reject(new Error('CHILD_EARLY_EXIT:' + code)); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('CHILD_READY_TIMEOUT')); }, timeoutMs);
    function cleanup() { clearTimeout(timeout); child.stdout?.off('data', onData); child.off('close', onClose); }
    child.stdout?.on('data', onData); child.on('close', onClose);
  });
}
async function closed(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve, reject) => {
    child.once('close', resolve);
    child.once('error', reject);
  });
}
async function caseLock(root, token) {
  const environment = { ...process.env, SYNTHETIC_TEST_ROOT: root, SYNTHETIC_TEST_PROOF: token };
  const owner = spawn(process.execPath, [process.argv[1], 'owner'], {
    env: environment, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
  });
  try {
    await waitLine(owner, 'SYNTHETIC_OWNER_LOCK_READY');
    const installedBefore = await digest(path.join(root, 'installed'));
    const stateBefore = await digest(path.join(root, 'state'));
    for (const mode of ['contend', 'recover']) {
      const result = runChild(root, token, mode);
      assert.equal(result.status, 77, 'CONCURRENT_CALL_NOT_BLOCKED:' + mode);
      assert.match(result.stdout, /SYNTHETIC_TRANSACTION_LOCK_BUSY/);
      assert.equal(await digest(path.join(root, 'installed')), installedBefore);
      assert.equal(await digest(path.join(root, 'state')), stateBefore);
      console.log('SYNTHETIC_LOCK_CASE_PASS=concurrent-' + mode);
    }
    owner.stdin.write('release\n');
    owner.stdin.end();
    await closed(owner);
    assert.equal(owner.exitCode, 0);
    const next = runChild(root, token, 'recover');
    assert.equal(next.status, 0);
    assert.match(next.stdout, /SYNTHETIC_CONTENDER_ACQUIRED=recover/);
    console.log('SYNTHETIC_LOCK_CASE_PASS=graceful-release');
  } finally {
    if (owner.exitCode === null && owner.signalCode === null) {
      owner.kill(); await closed(owner);
    }
  }
}
async function caseStaleLock(root, token) {
  const environment = { ...process.env, SYNTHETIC_TEST_ROOT: root, SYNTHETIC_TEST_PROOF: token };
  const owner = spawn(process.execPath, [process.argv[1], 'owner'], {
    env: environment, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
  });
  try {
    await waitLine(owner, 'SYNTHETIC_OWNER_LOCK_READY');
    owner.kill(); await closed(owner);
    const before = await fs.readFile(path.join(root, 'transaction.lock'));
    for (const mode of ['contend', 'recover']) {
      const denied = runChild(root, token, mode);
      assert.equal(denied.status, 77);
      assert.deepEqual(await fs.readFile(path.join(root, 'transaction.lock')), before);
    }
    console.log('SYNTHETIC_LOCK_CASE_PASS=crashed-owner-stale-lock-denied');
  } finally {
    if (owner.exitCode === null && owner.signalCode === null) {
      owner.kill(); await closed(owner);
    }
  }
}
async function caseWindowsFileShare(root) {
  if (process.platform !== 'win32') {
    console.log('SYNTHETIC_LOCK_CASE_SKIPPED=windows-fileshare-on-nonwindows');
    return;
  }
  // The lock is a true Windows FileStream FileShare.None, not a fake lock file.
  // We must never invoke this script on an actual user's installed program.
  const target = path.join(root, 'installed', 'dist', 'cli.js');
  const runner = String.raw`$ErrorActionPreference='Stop'; $stream = [System.IO.File]::Open($env:SYNTHETIC_FILE_TO_LOCK,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::None); try { Write-Output 'SYNTHETIC_WINDOWS_FILESHARE_READY'; Start-Sleep -Seconds 25 } finally { $stream.Dispose() }`;
  const child = spawn('pwsh', ['-NoProfile', '-NonInteractive', '-Command', runner], {
    env: { ...process.env, SYNTHETIC_FILE_TO_LOCK: target },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  try {
    await waitLine(child, 'SYNTHETIC_WINDOWS_FILESHARE_READY', 12000);
    const before = await digest(path.join(root, 'state'));
    const original = await fs.readFile(target, 'utf8').catch(e => {
      // Exclusive share denies opening the locked file on Windows as expected.
      if (e.code === 'EPERM' || e.code === 'EACCES' || e.code === 'EBUSY') return 'blocked';
      throw e;
    });
    assert.equal(original, 'blocked', 'WINDOWS_EXCLUSIVE_SHARE_NOT_ENFORCED');
    await assert.rejects(fs.rename(path.join(root, 'installed'), path.join(root, 'retired-locked')), e =>
      ['EPERM', 'EACCES', 'EBUSY'].includes(e?.code),
      'WINDOWS_LOCKED_DIRECTORY_RENAME_WAS_PERMITTED');
    assert.equal(await fs.readFile(target, 'utf8').catch(e =>
      ['EPERM','EACCES','EBUSY'].includes(e?.code) ? 'blocked' : 'unexpected'), 'blocked');
    assert.equal(await digest(path.join(root, 'state')), before);
    console.log('SYNTHETIC_LOCK_CASE_PASS=windows-exclusive-file-share-blocks-cutover');
  } finally {
    child.kill(); await closed(child);
  }
  await fs.rename(path.join(root, 'installed'), path.join(root, 'retired-locked'));
  await fs.rename(path.join(root, 'retired-locked'), path.join(root, 'installed'));
  console.log('SYNTHETIC_LOCK_CASE_PASS=windows-rename-reenabled-after-release');
}
async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), PREFIX));
  const token = randomBytes(24).toString('hex');
  try {
    await fs.writeFile(path.join(root, MARKER), token);
    await fs.mkdir(path.join(root, 'installed', 'dist'), { recursive: true });
    await fs.writeFile(path.join(root, 'installed', 'dist', 'cli.js'), 'synthetic-original');
    await fs.mkdir(path.join(root, 'state'));
    await fs.writeFile(path.join(root, 'state', 'settings.txt'), 'synthetic-protected');
    await caseLock(root, token);
    await caseStaleLock(root, token);
    // Discard only this synthetic crashed-worker lock, inside a marker-verified temp root.
    await verifyRoot(root, token);
    await fs.unlink(path.join(root, 'transaction.lock'));
    await caseWindowsFileShare(root);
    console.log(JSON.stringify({ code: 'SYNTHETIC_CONCURRENT_LOCK_AND_WINDOWS_FILESHARE_PASS',
      transactionOwnership: true, staleLockFailsClosed: true,
      actualWindowsFileShareTested: process.platform === 'win32',
      realInstalledAppTouched: false, realOwnerStateRead: false, productionUpgradeAuthorized: false }));
  } finally {
    await verifyRoot(root, token);
    await fs.rm(root, { recursive: true, force: true });
  }
}
if (MODE === 'orchestrate') await main();
else await executeMode();