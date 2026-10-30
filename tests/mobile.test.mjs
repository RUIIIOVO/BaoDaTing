import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs, parseDevices, doctor, probe, MCP_CONFIG } from '../skills/baodating/scripts/mobile.mjs';

const launcher = fileURLToPath(new URL('../skills/baodating/scripts/mobile.mjs', import.meta.url));
const version = 'Android Debug Bridge version 1.0.41\n';
const listing = rows => `List of devices attached\n${rows}\n`;
const device = 'fixture-device-a';
const options = { timeoutMs: 100 };
const fakeDoctor = (rows, extra = {}) => doctor({ ...options, ...extra }, {
  runProbe: async (_, args) => ({ status: 'ok', stdout: args[0] === 'version' ? version : listing(rows) }),
});

async function fixture(t, binaries = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'baodating-mobile-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const [name, source] of Object.entries(binaries)) {
    await writeFile(join(dir, name), `#!${process.execPath}\n${source}\n`, { mode: 0o755 });
  }
  return { dir, env: { ...process.env, PATH: dir } };
}

function invoke(args, env, { input, signalWhen, signal = 'SIGTERM', entry = launcher } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let sent = false;
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('CLI exceeded 5 second test deadline')); }, 5000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => {
      stderr += chunk;
      if (!sent && signalWhen && stderr.includes(signalWhen)) { sent = true; child.kill(signal); }
    });
    child.on('error', reject);
    child.on('close', (code, exitSignal) => { clearTimeout(timer); resolve({ code, signal: exitSignal, stdout, stderr }); });
    child.stdin.on('error', () => {});
    if (input !== undefined) child.stdin.end(input);
  });
}

function alive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === 'ESRCH') return false; throw error; }
}

// All IDs and tool traffic below are synthetic. No adb/npx from the host is used.
test('strict argument parsing and doctor bounds', () => {
  assert.equal(parseArgs([]).mode, 'launch');
  assert.deepEqual(parseArgs(['--doctor', '--json', '--device', device, '--timeout-ms', '100']), {
    mode: 'doctor', json: true, device, timeoutMs: 100,
  });
  for (const args of [
    ['--wat'], ['install'], ['--listen', '1234'], ['--stdio'], ['--json'], ['--device', device],
    ['--doctor', '--print-config'], ['--help', '--json'], ['--doctor', '--doctor'],
    ['--doctor', '--device'], ['--doctor', '--device', '--json'], ['--doctor', '--device', 'a b'],
    ...['99', '5001', '1.5', 'Infinity', 'NaN', '-1', '100ms'].map(n => ['--doctor', '--timeout-ms', n]),
  ]) assert.throws(() => parseArgs(args), undefined, args.join(' '));
});

test('print-config is pinned, offline, device-free and does not spawn', async t => {
  const { env } = await fixture(t, {
    npx: 'process.stderr.write("must not run npx"); process.exit(90);',
    adb: 'process.stderr.write("must not run adb"); process.exit(90);',
  });
  const result = await invoke(['--print-config'], { ...env, ANDROID_SERIAL: 'private-fixture', HOME: '/private/fixture' });
  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), {
    command: 'npx', args: ['--yes', '@mobilenext/mobile-mcp@1.0.14'],
    env: { MOBILEMCP_DISABLE_TELEMETRY: '1' },
  });
  assert.deepEqual(JSON.parse(result.stdout), MCP_CONFIG);
  assert.doesNotMatch(result.stdout, /private|fixture/);
});

test('symlink entrypoints execute help/config and importing them never launches', async t => {
  const { dir, env } = await fixture(t, { npx: 'process.stdout.write("must not launch");' });
  const linked = join(dir, 'linked-mobile.mjs');
  await symlink(launcher, linked);
  const help = await invoke(['--help'], env, { entry: linked });
  assert.equal(help.code, 0);
  assert.match(help.stdout, /Usage:/);
  const config = await invoke(['--print-config'], env, { entry: linked });
  assert.equal(config.code, 0);
  assert.deepEqual(JSON.parse(config.stdout), MCP_CONFIG);
  const importer = join(dir, 'importer.mjs');
  await writeFile(importer, `import ${JSON.stringify(pathToFileURL(linked).href)}; process.stdout.write('imported');`);
  const imported = await invoke([], env, { entry: importer });
  assert.equal(imported.code, 0);
  assert.equal(imported.stdout, 'imported');
  assert.equal(imported.stderr, '');
});

test('bad arguments never launch or echo sensitive inputs', async t => {
  const { env } = await fixture(t, { npx: 'process.stdout.write("LAUNCHED");' });
  const result = await invoke(['--secret=/private/fixture'], env);
  assert.equal(result.code, 2);
  assert.equal(result.stdout, '');
  assert.doesNotMatch(result.stderr, /private|fixture/);
});

test('adb parser accepts real row shape and rejects malformed success output', () => {
  assert.deepEqual(parseDevices(listing(`${device}\tdevice product:fixture model:fixture transport_id:1`)), [{ id: device, state: 'device' }]);
  assert.deepEqual(parseDevices(listing('')), []);
  assert.deepEqual(parseDevices(listing(`${device}\tno permissions (check udev rules)`)), [{ id: device, state: 'no permissions' }]);
  for (const text of ['', 'error: server died', `error: server died\n${listing('')}`, listing('garbage'), listing(`${device} device\n${device} device`)]) {
    assert.throws(() => parseDevices(text));
  }
});

for (const [row, expected] of [
  ['', 'absent'], [`${device}\tunauthorized`, 'unauthorized'], [`${device}\toffline`, 'offline'],
  [`${device}\trecovery`, 'unavailable'], [`${device}\tno permissions (fixture)`, 'unavailable'],
  [`${device}\tdevice`, 'ready'],
]) {
  test(`doctor state: ${expected}`, async () => {
    const result = await fakeDoctor(row);
    assert.equal(result.status, expected);
    assert.equal(result.ok, expected === 'ready');
    assert.doesNotMatch(JSON.stringify(result), /fixture-device/);
  });
}

test('multi-device never silently selects even one ready plus one unauthorized', async () => {
  const rows = `${device}\tdevice\nfixture-device-b\tunauthorized`;
  const multiple = await fakeDoctor(rows);
  assert.equal(multiple.status, 'multiple');
  assert.equal(multiple.ok, false);
  assert.equal((await fakeDoctor(rows, { device })).status, 'ready');
  assert.equal((await fakeDoctor(rows, { device: 'fixture-device-b' })).status, 'unauthorized');
  assert.equal((await fakeDoctor(rows, { device: 'fixture-missing' })).status, 'device-not-found');
});

for (const stage of ['version', 'devices']) {
  for (const status of ['missing', 'timeout', 'error', 'spawn-error', 'output-limit', 'interrupted']) {
    test(`doctor propagates ${stage} ${status}, even with plausible stdout`, async () => {
      const calls = [];
      const result = await doctor(options, { runProbe: async (_, args) => {
        calls.push(args);
        return args[0] === stage
          ? { status, stdout: `${version}${listing(`${device} device`)}`, code: 1 }
          : { status: 'ok', stdout: version };
      } });
      assert.equal(result.ok, false);
      assert.equal(result.status, status === 'missing' ? 'adb-missing' : ['error', 'spawn-error'].includes(status) ? 'adb-error' : status);
      assert.equal(calls.length, stage === 'version' ? 1 : 2);
    });
  }
}

test('doctor validates version and device output before returning ready', async () => {
  const result = await doctor(options, { runProbe: async () => ({ status: 'ok', stdout: 'not adb' }) });
  assert.equal(result.status, 'invalid-output');
  const invalidDevices = await doctor(options, { runProbe: async (_, args) => ({ status: 'ok', stdout: args[0] === 'version' ? version : 'error: unavailable' }) });
  assert.equal(invalidDevices.status, 'invalid-output');
});

test('bounded subprocess: missing, nonzero, timeout, output overflow', async t => {
  const dir = (await fixture(t)).dir;
  assert.equal((await probe(join(dir, 'missing'), [], 100)).status, 'missing');
  assert.equal((await probe(process.execPath, ['-e', 'process.stdout.write("ok");process.exit(7)'], 500)).status, 'error');
  const started = performance.now();
  assert.equal((await probe(process.execPath, ['-e', 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'], 150)).status, 'timeout');
  assert.ok(performance.now() - started < 1500, 'timeout + kill grace is bounded');
  assert.equal((await probe(process.execPath, ['-e', 'process.stdout.write("x".repeat(70000));setInterval(()=>{},1000)'], 500)).status, 'output-limit');
});

test('doctor CLI reports timeout without serials, paths, stderr leaks or success exit', async t => {
  const { env } = await fixture(t, { adb: `
    if (process.argv[2] === 'version') process.stdout.write(${JSON.stringify(version)});
    else { process.stderr.write('/private/fixture serial-secret'); process.on('SIGTERM',()=>{}); setInterval(()=>{},1000); }
  ` });
  const result = await invoke(['--doctor', '--json', '--timeout-ms', '1500'], env);
  assert.equal(result.code, 1);
  assert.equal(result.stderr, '');
  assert.equal(JSON.parse(result.stdout).status, 'timeout');
  assert.equal(JSON.parse(result.stdout).stage, 'adb-devices');
  assert.doesNotMatch(result.stdout, /private|serial-secret/);
});

test('doctor CLI returns ready JSON and nonzero for unauthorized', async t => {
  const { env } = await fixture(t, { adb: `
    process.stdout.write(process.argv[2] === 'version' ? ${JSON.stringify(version)} :
      'List of devices attached\\nfixture-device-a\\t' + process.env.FIXTURE_STATE + '\\n');
  ` });
  const ready = await invoke(['--doctor', '--json'], { ...env, FIXTURE_STATE: 'device' });
  assert.equal(ready.code, 0);
  assert.equal(JSON.parse(ready.stdout).status, 'ready');
  const denied = await invoke(['--doctor', '--json'], { ...env, FIXTURE_STATE: 'unauthorized' });
  assert.equal(denied.code, 1);
  assert.equal(JSON.parse(denied.stdout).status, 'unauthorized');
});

test('launcher invokes only pinned npx arguments and preserves protocol stdio / exit code', async t => {
  const { env } = await fixture(t, { npx: `
    if (JSON.stringify(process.argv.slice(2)) !== JSON.stringify(['--yes','@mobilenext/mobile-mcp@1.0.14'])) process.exit(88);
    if (process.env.MOBILEMCP_DISABLE_TELEMETRY !== '1') process.exit(89);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => process.stdout.write(chunk));
    process.stdin.on('end', () => process.exit(7));
  `, adb: 'process.stdout.write("must not probe");process.exit(90);' });
  const input = '{"jsonrpc":"2.0","id":1,"method":"fixture"}\n';
  const result = await invoke([], env, { input });
  assert.equal(result.code, 7);
  assert.equal(result.stdout, input);
  assert.equal(result.stderr, '');
});

test('missing npx fails on stderr with empty protocol stdout', async t => {
  const { env } = await fixture(t);
  const result = await invoke([], env);
  assert.equal(result.code, 127);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /could not start npx/);
});

for (const [signal, expectedCode] of [['SIGTERM', 143], ['SIGINT', 130], ['SIGHUP', 129]]) {
  test(`launcher forwards ${signal} and kills stubborn npm descendants`, { skip: process.platform === 'win32' }, async t => {
    const { dir, env } = await fixture(t, { npx: `
      const { spawn } = require('node:child_process');
      const fs = require('node:fs');
      const descendant = spawn(process.execPath, ['-e',
        'process.on("SIGTERM",()=>{});process.on("SIGINT",()=>{});process.on("SIGHUP",()=>{});process.stdout.write("ready");setInterval(()=>{},1000)'
      ], { stdio:['ignore','pipe','ignore'] });
      descendant.stdout.once('data',()=>{
        fs.writeFileSync(process.env.PID_FILE, String(descendant.pid));
        process.stderr.write('fixture-ready');
      });
      process.on('${signal}', () => { fs.writeFileSync(process.env.SIGNAL_FILE, '${signal}'); process.exit(0); });
    ` });
    const pidFile = join(dir, 'pid');
    const signalFile = join(dir, 'signal');
    t.after(async () => {
      try { process.kill(Number(await readFile(pidFile, 'utf8')), 'SIGKILL'); } catch {}
    });
    const result = await invoke([], { ...env, PID_FILE: pidFile, SIGNAL_FILE: signalFile }, { signalWhen: 'fixture-ready', signal });
    assert.equal(result.code, expectedCode);
    assert.equal(result.stdout, '');
    assert.equal(await readFile(signalFile, 'utf8'), signal);
    const pid = Number(await readFile(pidFile, 'utf8'));
    // Give the operating system one scheduler turn to reap a just-killed orphan.
    for (let i = 0; i < 20 && alive(pid); i++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(alive(pid), false, 'grandchild in owned npx group must be reaped');
  });
}

test('normal npx exit also cleans a leftover descendant', { skip: process.platform === 'win32' }, async t => {
  const { dir, env } = await fixture(t, { npx: `
    const { spawn } = require('node:child_process'); const fs = require('node:fs');
    const child = spawn(process.execPath, ['-e','process.on("SIGTERM",()=>{});process.stdout.write("ready");setInterval(()=>{},1000)'], {stdio:['ignore','pipe','ignore']});
    child.stdout.once('data',()=>{fs.writeFileSync(process.env.PID_FILE,String(child.pid));process.exit(23);});
  ` });
  const pidFile = join(dir, 'pid');
  t.after(async () => { try { process.kill(Number(await readFile(pidFile, 'utf8')), 'SIGKILL'); } catch {} });
  const result = await invoke([], { ...env, PID_FILE: pidFile });
  assert.equal(result.code, 23);
  assert.equal(result.stdout, '');
  const pid = Number(await readFile(pidFile, 'utf8'));
  for (let i = 0; i < 20 && alive(pid); i++) await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(alive(pid), false);
});
