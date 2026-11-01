// Destructive-looking operations are limited to temporary synthetic fixtures.
// This is NOT an installer and cannot accept a live installation path.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { promises as fs, writeSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PREFIX = 'chatgpt2codex-crash-simulation-';
const MARKER = '.synthetic-only-no-production';
const CRASH_EXIT = 73;
const DENY_EXIT = 74;
const ALLOWED_MODES = new Set(['worker', 'recover']);

function hash(value) { return createHash('sha256').update(value).digest('hex'); }
function reject(code) { throw new Error(code); }
async function exists(p) {
  try { await fs.lstat(p); return true; }
  catch (e) { if (e?.code === 'ENOENT') return false; throw e; }
}
async function digest(root) {
  if (!await exists(root)) return null;
  const entries = [];
  async function visit(dir, prefix = '') {
    for (const name of (await fs.readdir(dir)).sort()) {
      const p = path.join(dir, name);
      const relative = prefix ? prefix + '/' + name : name;
      const s = await fs.lstat(p);
      if (s.isSymbolicLink() || (!s.isFile() && !s.isDirectory())) reject('SYNTHETIC_UNSAFE_FILE_KIND');
      if (s.isDirectory()) await visit(p, relative);
      else entries.push(relative + ':' + hash(await fs.readFile(p)));
    }
  }
  await visit(root);
  return hash(entries.join('\n'));
}
async function put(dir, files) {
  await fs.mkdir(dir, { recursive: true });
  for (const [name, bytes] of Object.entries(files)) {
    const p = path.join(dir, name);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, bytes);
  }
}
async function guardedRoot() {
  const root = process.env.SYNTHETIC_CRASH_TEST_ROOT;
  const proof = process.env.SYNTHETIC_CRASH_TEST_PROOF;
  if (!root || !proof || !path.isAbsolute(root)) reject('SYNTHETIC_ROOT_NOT_AUTHORIZED');
  const base = await fs.realpath(os.tmpdir());
  const actual = await fs.realpath(root);
  if (path.dirname(actual) !== base || !path.basename(actual).startsWith(PREFIX))
    reject('SYNTHETIC_ROOT_OUTSIDE_TEMP');
  if ((await fs.readFile(path.join(actual, MARKER), 'utf8')) !== proof)
    reject('SYNTHETIC_MARKER_OR_PROOF_INVALID');
  return actual;
}
function files(root) {
  return Object.fromEntries(['installed', 'retired', 'staged', 'backup', 'state',
    'quarantined-candidate', 'journal.json'].map(n => [n, path.join(root, n)]));
}
async function persistJournal(root, record) {
  const tmp = path.join(root, 'journal-writing.tmp');
  const handle = await fs.open(tmp, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(record) + '\n'); await handle.sync(); }
  finally { await handle.close(); }
  await fs.rename(tmp, path.join(root, 'journal.json'));
  // This is a process-termination test, NOT a claim of power-loss durability.
}
async function readJournal(root) {
  let record;
  try { record = JSON.parse(await fs.readFile(path.join(root, 'journal.json'), 'utf8')); }
  catch { reject('SYNTHETIC_JOURNAL_MISSING_OR_CORRUPT'); }
  const keys = Object.keys(record).sort().join(',');
  if (keys !== 'candidateDigest,originalDigest,phase,stateDigest,version' ||
      record.version !== 1 ||
      !['ready', 'retired', 'active'].includes(record.phase) ||
      ![record.candidateDigest, record.originalDigest, record.stateDigest]
        .every(x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)))
    reject('SYNTHETIC_JOURNAL_INVALID');
  return record;
}
function crashIf(point) {
  if (process.env.SYNTHETIC_CRASH_POINT === point) {
    // fsync'd records and completed renames remain; no catch/finally runs.
    writeSync(1, 'SYNTHETIC_PROCESS_EXIT=' + point + '\n');
    process.exit(CRASH_EXIT);
  }
}
async function worker(root) {
  const f = files(root);
  const j = await readJournal(root);
  if (j.phase !== 'ready' ||
      await digest(f.backup) !== j.originalDigest ||
      await digest(f.installed) !== j.originalDigest ||
      await digest(f.staged) !== j.candidateDigest ||
      await digest(f.state) !== j.stateDigest)
    reject('SYNTHETIC_PREFLIGHT_DENIED');
  crashIf('before-retire');
  await fs.rename(f.installed, f.retired);
  crashIf('after-retire-before-journal');
  j.phase = 'retired';
  await persistJournal(root, j);
  crashIf('after-retire-journal');
  await fs.rename(f.staged, f.installed);
  crashIf('after-activate-before-journal');
  j.phase = 'active';
  await persistJournal(root, j);
  crashIf('after-activate-journal');
  reject('SYNTHETIC_WORKER_MUST_CRASH_IN_TEST');
}
async function recover(root) {
  const f = files(root);
  const j = await readJournal(root);
  // Verify everything important BEFORE the first rename. Unknown state blocks.
  if (await digest(f.backup) !== j.originalDigest) reject('SYNTHETIC_BACKUP_CORRUPT');
  if (await digest(f.state) !== j.stateDigest) reject('SYNTHETIC_STATE_TOUCHED');
  const old = await digest(f.retired);
  const current = await digest(f.installed);
  if (old === null) {
    if (current !== j.originalDigest) reject('SYNTHETIC_AMBIGUOUS_NO_ORIGINAL');
    console.log('SYNTHETIC_RECOVERY=ALREADY_ORIGINAL');
    return;
  }
  if (old !== j.originalDigest) reject('SYNTHETIC_RETIRED_ORIGINAL_CORRUPT');
  if (current !== null && current !== j.candidateDigest)
    reject('SYNTHETIC_UNKNOWN_INSTALLED_BYTES');
  const quarantine = await digest(f['quarantined-candidate']);
  // A previous recovery process may have crashed AFTER quarantining the
  // candidate but BEFORE restoring the retired original. Resume safely.
  if (quarantine !== null &&
      !(current === null && quarantine === j.candidateDigest)) {
    reject('SYNTHETIC_QUARANTINE_COLLISION');
  }
  if (current !== null) {
    await fs.rename(f.installed, f['quarantined-candidate']);
    crashIf('after-quarantine');
  }
  await fs.rename(f.retired, f.installed);
  crashIf('after-restore');
  if (await digest(f.installed) !== j.originalDigest) reject('SYNTHETIC_ROLLBACK_VERIFY_FAILED');
  console.log('SYNTHETIC_RECOVERY=RESTORED_ORIGINAL');
}
function child(mode, root, proof, point) {
  const r = spawnSync(process.execPath, [process.argv[1], '--' + mode], {
    env: { ...process.env, SYNTHETIC_CRASH_TEST_ROOT: root,
      SYNTHETIC_CRASH_TEST_PROOF: proof, SYNTHETIC_CRASH_POINT: point || '' },
    encoding: 'utf8', timeout: 15_000, windowsHide: true,
  });
  if (r.error) reject('SYNTHETIC_CHILD_RUNTIME_ERROR:' + r.error.code);
  return r;
}
function expectStatus(result, status, label) {
  assert.equal(result.status, status, label + ': ' + (result.stderr || '').slice(0, 500));
}
async function makeFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), PREFIX));
  const proof = randomBytes(24).toString('hex');
  await fs.writeFile(path.join(root, MARKER), proof);
  const f = files(root);
  await put(f.installed, {
    'dist/cli.js': 'synthetic-original-mcp',
    'version.txt': '0.2.0',
    'menu/start.cmd': 'synthetic-old-start',
  });
  await put(f.staged, {
    'dist/cli.js': 'synthetic-candidate-with-goal',
    'version.txt': '0.2.0',
    'menu/start.cmd': 'synthetic-new-start',
  });
  await put(f.state, {
    'settings.txt': 'synthetic-private-state-only',
    'owner-token.txt': 'not-a-real-token',
  });
  await fs.cp(f.installed, f.backup, { recursive: true, errorOnExist: true, force: false });
  const originalDigest = await digest(f.installed);
  const candidateDigest = await digest(f.staged);
  const stateDigest = await digest(f.state);
  assert.equal(await digest(f.backup), originalDigest);
  await persistJournal(root, {
    version: 1, phase: 'ready', originalDigest, candidateDigest, stateDigest,
  });
  return { root, proof, f, originalDigest, candidateDigest, stateDigest };
}
async function cleanup(fixture) {
  const actual = await fs.realpath(fixture.root);
  const temp = await fs.realpath(os.tmpdir());
  assert.equal(path.dirname(actual), temp);
  assert(path.basename(actual).startsWith(PREFIX));
  assert.equal(await fs.readFile(path.join(actual, MARKER), 'utf8'), fixture.proof);
  await fs.rm(actual, { recursive: true, force: true });
}
async function simulate(label, point, corruption = null, recoveryCrash = null) {
  const fx = await makeFixture();
  try {
    const terminated = child('worker', fx.root, fx.proof, point);
    expectStatus(terminated, CRASH_EXIT, 'CRASH_NOT_INJECTED:' + label);
    assert(terminated.stdout.includes('SYNTHETIC_PROCESS_EXIT=' + point));
    if (corruption === 'backup') {
      await fs.writeFile(path.join(fx.f.backup, 'dist/cli.js'), 'CORRUPTED_BACKUP');
    } else if (corruption === 'journal') {
      await fs.writeFile(fx.f['journal.json'], 'TRUNCATED_JOURNAL');
    } else if (corruption === 'installed') {
      await fs.writeFile(path.join(fx.f.installed, 'dist/cli.js'), 'FOREIGN_APPLICATION_BYTES');
    } else if (corruption === 'state') {
      await fs.writeFile(path.join(fx.f.state, 'settings.txt'), 'FOREIGN_USER_STATE');
    }
    if (corruption) {
      const stateBefore = await digest(fx.f.state);
      const oldBefore = await digest(fx.f.retired);
      const installedBefore = await digest(fx.f.installed);
      const blocked = child('recover', fx.root, fx.proof);
      expectStatus(blocked, DENY_EXIT, 'CORRUPTION_NOT_DENIED:' + label);
      assert.equal(await digest(fx.f.installed), installedBefore);
      assert.equal(await digest(fx.f.retired), oldBefore);
      assert.equal(await digest(fx.f.state), stateBefore);
    } else {
      if (recoveryCrash) {
        const first = child('recover', fx.root, fx.proof, recoveryCrash);
        expectStatus(first, CRASH_EXIT, 'RECOVERY_INTERRUPTION_NOT_INJECTED:' + label);
        assert(first.stdout.includes('SYNTHETIC_PROCESS_EXIT=' + recoveryCrash));
      }
      const restored = child('recover', fx.root, fx.proof);
      expectStatus(restored, 0, 'RECOVERY_FAILED:' + label);
      assert.equal(await digest(fx.f.installed), fx.originalDigest);
      assert.equal(await digest(fx.f.state), fx.stateDigest);
      assert.equal(await digest(fx.f.backup), fx.originalDigest);
      assert.equal(await digest(fx.f.retired), null);
      const repeated = child('recover', fx.root, fx.proof);
      expectStatus(repeated, 0, 'RECOVERY_NOT_IDEMPOTENT:' + label);
      assert(repeated.stdout.includes('ALREADY_ORIGINAL'));
    }
    console.log('SYNTHETIC_CRASH_CASE_PASS=' + label);
  } finally { await cleanup(fx); }
}
async function main() {
  const [mode] = process.argv.slice(2);
  if (mode) {
    if (!mode.startsWith('--') || !ALLOWED_MODES.has(mode.slice(2)) || process.argv.length !== 3)
      reject('SYNTHETIC_UNAUTHORIZED_CHILD_MODE');
    const root = await guardedRoot();
    if (mode === '--worker') await worker(root);
    else await recover(root);
    return;
  }
  const scenarios = [
    ['crash-before-retire', 'before-retire'],
    ['crash-retired-before-journal', 'after-retire-before-journal'],
    ['crash-retired-after-journal', 'after-retire-journal'],
    ['crash-active-before-journal', 'after-activate-before-journal'],
    ['crash-active-after-journal', 'after-activate-journal'],
    ['recovery-crash-after-quarantine', 'after-activate-journal', null, 'after-quarantine'],
    ['recovery-crash-after-restore', 'after-activate-journal', null, 'after-restore'],
    ['reject-corrupt-backup', 'after-retire-journal', 'backup'],
    ['reject-corrupt-journal', 'after-retire-journal', 'journal'],
    ['reject-foreign-installed', 'after-activate-journal', 'installed'],
    ['reject-state-modification', 'after-retire-journal', 'state'],
  ];
  for (const [label, point, corruption, recoveryCrash] of scenarios)
    await simulate(label, point, corruption, recoveryCrash);
  console.log(JSON.stringify({
    code: 'SYNTHETIC_PROCESS_CRASH_AND_JOURNAL_RECOVERY_PASS',
    casesPassed: scenarios.length, crashExitCode: CRASH_EXIT,
    realInstallationTouched: false, realOwnerStateRead: false,
    productionUpgradeImplemented: false, realPowerLossTested: false,
  }));
}
main().catch(e => {
  console.error('SYNTHETIC_TEST_FAILED=' + String(e.message).slice(0, 600));
  process.exitCode = DENY_EXIT;
});
