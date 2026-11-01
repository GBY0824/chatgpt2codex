// Synthetic Windows cutover and rollback test only. NOT an installer.
// No input paths accepted; creates isolated disposable fixtures only under OS temp.
// No real Windows installation, process, service, credentials, OAuth or registry accessed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

if (process.argv.length !== 2) {
  throw new Error('SYNTHETIC_ONLY_NO_INSTALL_PATH_ARGUMENTS');
}

const PREFIX = 'chatgpt2codex-synthetic-cutover-';
const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), PREFIX));
const expectedMarker = 'synthetic-mcp-fixture-v1';
let casesPassed = 0;

async function exists(p) {
  try { await fs.lstat(p); return true; }
  catch (err) { if (err?.code === 'ENOENT') return false; throw err; }
}

async function writeFixture(dir, files) {
  await fs.mkdir(dir, { recursive: true });
  for (const [relative, value] of Object.entries(files)) {
    const p = path.join(dir, relative);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, value, 'utf8');
  }
}

async function treeDigest(dir) {
  const entries = [];
  async function walk(root, prefix = '') {
    for (const name of (await fs.readdir(root)).sort()) {
      const file = path.join(root, name);
      const info = await fs.lstat(file);
      assert(!info.isSymbolicLink(), 'SYNTHETIC_LINK_UNEXPECTED');
      const relative = prefix ? prefix + '/' + name : name;
      if (info.isDirectory()) await walk(file, relative);
      else {
        assert(info.isFile(), 'SYNTHETIC_FILE_KIND_INVALID');
        const digest = createHash('sha256').update(await fs.readFile(file)).digest('hex');
        entries.push(relative + ':' + digest);
      }
    }
  }
  await walk(dir);
  return createHash('sha256').update(entries.join('\n')).digest('hex');
}

async function runCase(name, fault) {
  const root = path.join(fixtureRoot, name);
  const installed = path.join(root, 'installed');
  const candidate = path.join(root, 'candidate');
  const state = path.join(root, 'independent-state');
  const backup = path.join(root, 'verified-backup');
  const prepared = path.join(root, 'prepared-new');
  const retired = path.join(root, 'retired-old');
  const failed = path.join(root, 'failed-new');

  await writeFixture(installed, {
    '.synthetic-mcp-marker': expectedMarker,
    'dist/cli.js': 'synthetic-original-v0.2.0',
    'package.json': '{"name":"chatgpt2codex","version":"0.2.0"}',
    'bin/start.cmd': '@echo off\r\necho synthetic-original\r\n',
  });
  await writeFixture(candidate, {
    '.synthetic-mcp-marker': expectedMarker,
    'dist/cli.js': 'synthetic-candidate-goal-scoped',
    'package.json': '{"name":"chatgpt2codex","version":"0.2.0"}',
    'bin/start.cmd': '@echo off\r\necho synthetic-candidate\r\n',
  });
  await writeFixture(state, {
    'owner-state.txt': 'synthetic-only-not-a-real-token',
    'service-startup.json': '{"endpoint":"127.0.0.1:7979","mode":"synthetic"}',
  });

  const before = await treeDigest(installed);
  const wanted = await treeDigest(candidate);
  const protectedState = await treeDigest(state);
  let switched = false;
  let deployed = false;
  let expectedFailure = false;
  let causeCode = '';
  try {
    assert.equal(await fs.readFile(path.join(installed, '.synthetic-mcp-marker'), 'utf8'),
      expectedMarker, 'SYNTHETIC_LEGACY_MARKER_REQUIRED');
    if (fault === 'missing-marker') {
      await fs.rm(path.join(installed, '.synthetic-mcp-marker'));
      throw new Error('SYNTHETIC_MARKER_MISSING');
    }
    if (fault === 'running-service') {
      throw new Error('SYNTHETIC_RUNNING_SERVICE_DENIED');
    }
    if (fault === 'bad-candidate') {
      await fs.writeFile(path.join(candidate, 'dist/cli.js'), 'tampered-after-manifest');
    }
    // All copies/receipts are inside the new disposable fixture root.
    await fs.cp(installed, backup, { recursive: true, errorOnExist: true, force: false });
    assert.equal(await treeDigest(backup), before, 'SYNTHETIC_BACKUP_MISMATCH');
    await fs.cp(candidate, prepared, { recursive: true, errorOnExist: true, force: false });
    assert.equal(await treeDigest(prepared), wanted, 'SYNTHETIC_CANDIDATE_HASH_MISMATCH');

    await fs.rename(installed, retired);
    switched = true;
    if (fault === 'after-retire') throw new Error('SYNTHETIC_INJECT_AFTER_RETIRE');
    await fs.rename(prepared, installed);
    deployed = true;
    if (fault === 'after-activate') throw new Error('SYNTHETIC_INJECT_AFTER_ACTIVATE');
    assert.equal(await treeDigest(installed), wanted, 'SYNTHETIC_DEPLOY_HASH_MISMATCH');
    assert.equal(await treeDigest(state), protectedState, 'SYNTHETIC_STATE_CHANGED');
    assert.equal(await treeDigest(retired), before, 'SYNTHETIC_PREVIOUS_COPY_CHANGED');
  } catch (err) {
    expectedFailure = true;
    causeCode = String(err.message);
    // Failed-to-install candidate is isolated; never delete an unverified old copy.
    if (deployed && await exists(installed)) await fs.rename(installed, failed);
    if (switched && await exists(retired)) {
      await fs.rename(retired, installed);
    }
    // Fail closed if the original bytes cannot be restored.
    if (fault !== 'missing-marker') {
      assert(await exists(installed), 'SYNTHETIC_RECOVERY_LOST_ORIGINAL');
      assert.equal(await treeDigest(installed), before, 'SYNTHETIC_ROLLBACK_MISMATCH');
    } else {
      // This scenario only tests rejection, not live production restore.
      assert(!await exists(retired), 'SYNTHETIC_MARKER_DENIAL_MOVED_INSTALL');
    }
    assert.equal(await treeDigest(state), protectedState, 'SYNTHETIC_FAILED_STATE_CHANGED');
  }

  if (fault === 'none') {
    assert(!expectedFailure, 'SYNTHETIC_SUCCESS_PATH_FAILED:' + causeCode);
    assert.equal(await treeDigest(installed), wanted);
  } else {
    assert(expectedFailure, 'SYNTHETIC_FAULT_NOT_REJECTED:' + fault);
    const wantedCode = {
      'missing-marker': 'SYNTHETIC_MARKER_MISSING',
      'running-service': 'SYNTHETIC_RUNNING_SERVICE_DENIED',
      'bad-candidate': 'SYNTHETIC_CANDIDATE_HASH_MISMATCH',
      'after-retire': 'SYNTHETIC_INJECT_AFTER_RETIRE',
      'after-activate': 'SYNTHETIC_INJECT_AFTER_ACTIVATE',
    }[fault];
    assert.equal(causeCode, wantedCode, 'SYNTHETIC_WRONG_REJECTION_REASON');
  }
  casesPassed += 1;
  console.log('SYNTHETIC_CASE_PASS=' + name);
}

try {
  // Verify successful file switch and each failure boundary independently.
  for (const [name, fault] of [
    ['happy-path', 'none'],
    ['reject-missing-marker', 'missing-marker'],
    ['reject-running-service', 'running-service'],
    ['reject-tampered-candidate', 'bad-candidate'],
    ['rollback-after-retire', 'after-retire'],
    ['rollback-after-activate', 'after-activate'],
  ]) await runCase(name, fault);

  console.log(JSON.stringify({
    code: 'SYNTHETIC_WINDOWS_CUTOVER_AND_ROLLBACK_PASS',
    casesPassed,
    productionTouched: false,
    realOwnerStateRead: false,
    liveInstallerImplemented: false,
    liveCutoverApproved: false,
  }));
} finally {
  // Only remove the private temp root generated by this very test process.
  assert(path.basename(fixtureRoot).startsWith(PREFIX),
    'SYNTHETIC_CLEANUP_PATH_GUARD');
  await fs.rm(fixtureRoot, { recursive: true, force: true });
}
