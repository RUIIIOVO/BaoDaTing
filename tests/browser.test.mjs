import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { UPSTREAM, resolvePaths, childEnvironment, buildLaunch, configuration, prepareProfile, superviseChild, main } from '../skills/baodating/scripts/browser.mjs';

const launcher = fileURLToPath(new URL('../skills/baodating/scripts/browser.mjs', import.meta.url));
const moduleUrl = new URL('../skills/baodating/scripts/browser.mjs', import.meta.url).href;
const repository = path.resolve(path.dirname(launcher), '../../..');
const supported = ['linux', 'darwin'].includes(process.platform);
function fixture(t) {
  const base = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'baodating-test-'));
  fs.chmodSync(base, 0o700);
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  return { base, root: path.join(base, 'private-data') };
}
function mode(target) { return fs.statSync(target).mode & 0o777; }
function mockSupervisor(overrides = {}) {
  const child = new EventEmitter();
  child.pid = 424242;
  const host = new EventEmitter();
  const kills = [];
  const timers = [];
  const cleared = [];
  const reports = [];
  const calls = [];
  const deps = {
    host,
    spawnChild: (...args) => { calls.push(args); return child; },
    killGroup: (...args) => kills.push(args),
    setTimer: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; },
    clearTimer: timer => cleared.push(timer),
    report: message => reports.push(message),
    ...overrides,
  };
  return { child, host, kills, timers, cleared, reports, calls, deps };
}

// No test starts Chrome or npx. Real process tests below use only Node fixtures.
test('default and explicit data roots always append the dedicated profile', { skip: !supported }, t => {
  const { base, root } = fixture(t);
  assert.equal(resolvePaths({}, base).profilePath, path.join(base, '.local/share/baodating/browser/research-profile'));
  assert.equal(resolvePaths({ XDG_DATA_HOME: path.join(base, 'xdg') }, base).root, path.join(base, 'xdg/baodating'));
  const paths = resolvePaths({ BAODATING_DATA_DIR: root, XDG_DATA_HOME: 'ignored-relative' }, base);
  assert.equal(paths.profilePath, path.join(root, 'browser/research-profile'));
  assert.equal(fs.existsSync(root), false);
  assert.equal(configuration(paths).env.BAODATING_DATA_DIR, root);
});

test('reject relative, ambiguous, system, home, repository, and daily-browser paths', { skip: !supported }, t => {
  const { base } = fixture(t);
  const roots = ['', 'relative', '~/research', '/', base, os.tmpdir(), path.join(base, 'Documents'), path.join(base, '.ssh'), '/etc/baodating', '/private/etc/baodating', '/dev/shm/research', `${base}/a/../b`, `${base}/bad\nname`, path.join(repository, 'private-research'), path.join(base, '.config/google-chrome/research'), path.join(base, 'Library/Application Support/Google/Chrome/research'), path.join(base, 'AppData/Local/Google/Chrome/User Data/research'), path.join(base, '.cache/chrome-devtools-mcp/research')];
  for (const root of roots) assert.throws(() => resolvePaths({ BAODATING_DATA_DIR: root }, base), undefined, root);
  assert.throws(() => resolvePaths({ XDG_DATA_HOME: '' }, base));
  assert.throws(() => resolvePaths({ XDG_DATA_HOME: 'relative' }, base));
  const otherRepo = path.join(base, 'other-repo');
  fs.mkdirSync(otherRepo);
  fs.writeFileSync(path.join(otherRepo, '.git'), 'gitdir: elsewhere\n');
  assert.throws(() => resolvePaths({ BAODATING_DATA_DIR: path.join(otherRepo, 'state') }), /Git repositories/);
});

test('canonicalize ancestor aliases, but refuse dedicated root/profile symlinks and unsafe parents', { skip: !supported }, t => {
  const { base, root } = fixture(t);
  const actual = path.join(base, 'actual');
  fs.mkdirSync(actual);
  const alias = path.join(base, 'alias');
  fs.symlinkSync(actual, alias, 'dir');
  assert.equal(resolvePaths({ BAODATING_DATA_DIR: path.join(alias, 'new-root') }).root, path.join(actual, 'new-root'));
  fs.symlinkSync(actual, root, 'dir');
  assert.throws(() => resolvePaths({ BAODATING_DATA_DIR: root }), /symlink/);
  fs.unlinkSync(root);
  fs.mkdirSync(root);
  fs.mkdirSync(path.join(root, 'browser'));
  fs.symlinkSync(actual, path.join(root, 'browser/research-profile'), 'dir');
  assert.throws(() => resolvePaths({ BAODATING_DATA_DIR: root }), /symlink/);
  fs.unlinkSync(path.join(root, 'browser/research-profile'));
  fs.chmodSync(root, 0o777);
  assert.throws(() => resolvePaths({ BAODATING_DATA_DIR: root }), /writable/);
  fs.chmodSync(root, 0o700);
  const repoAlias = path.join(base, 'repo-alias');
  fs.symlinkSync(repository, repoAlias, 'dir');
  assert.throws(() => resolvePaths({ BAODATING_DATA_DIR: path.join(repoAlias, 'private-research') }), /repositories|source tree/);
  if (process.platform === 'darwin') {
    const mac = resolvePaths({ BAODATING_DATA_DIR: `/tmp/baodating-never-created-${process.pid}` });
    assert.equal(mac.root, `/private/tmp/baodating-never-created-${process.pid}`);
  }
});

test('print-config is pure JSON configuration, contains no inherited secrets, and writes no state', { skip: !supported }, async t => {
  const { root } = fixture(t);
  let output = '';
  let errors = '';
  const code = await main(['--print-config'], { BAODATING_DATA_DIR: root, SECRET: 'never-copy' }, {
    stdout: value => { output += value; }, stderr: value => { errors += value; },
    run: () => assert.fail('must not spawn'),
  });
  assert.equal(code, 0);
  assert.equal(errors, '');
  const config = JSON.parse(output);
  assert.deepEqual(Object.keys(config), ['command', 'args', 'env', 'profilePath', 'profileNote']);
  assert.equal(config.command, process.execPath);
  assert.deepEqual(config.args, [launcher]);
  assert.deepEqual(config.env, { BAODATING_DATA_DIR: root });
  assert.equal(config.profilePath, path.join(root, 'browser/research-profile'));
  assert.equal(output.includes('never-copy'), false);
  assert.equal(fs.existsSync(root), false);
  const real = spawnSync(process.execPath, [launcher, '--print-config'], { env: { ...process.env, BAODATING_DATA_DIR: root }, encoding: 'utf8' });
  assert.equal(real.status, 0, real.stderr);
  assert.equal(JSON.parse(real.stdout).profilePath, config.profilePath);
  assert.equal(fs.existsSync(root), false);
});

test('symlink skill CLI runs help/config, while importing it never executes the launcher', { skip: !supported }, t => {
  const { base, root } = fixture(t);
  const skills = path.join(base, '.claude/skills');
  fs.mkdirSync(skills, { recursive: true });
  fs.symlinkSync(path.dirname(path.dirname(launcher)), path.join(skills, 'baodating'), 'dir');
  const linked = path.join(skills, 'baodating/scripts/browser.mjs');
  const env = { ...process.env, BAODATING_DATA_DIR: root };
  const help = spawnSync(process.execPath, [linked, '--help'], { env, encoding: 'utf8', timeout: 5000 });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /stdio MCP/);
  const config = spawnSync(process.execPath, [linked, '--print-config'], { env, encoding: 'utf8', timeout: 5000 });
  assert.equal(config.status, 0, config.stderr);
  assert.equal(JSON.parse(config.stdout).profilePath, path.join(root, 'browser/research-profile'));
  assert.equal(fs.existsSync(root), false);
  const importer = path.join(base, 'importer.mjs');
  fs.writeFileSync(importer, `await import(${JSON.stringify(new URL(`file://${linked}`).href)}); console.log('import-only');`);
  const imported = spawnSync(process.execPath, [importer, '--help'], { env, encoding: 'utf8', timeout: 5000 });
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, 'import-only\n');
  assert.equal(fs.existsSync(root), false);
});

test('CLI rejects connection, configuration, passthrough, unknown and conflicting flags before any state or spawn', { skip: !supported }, async t => {
  const { root } = fixture(t);
  const rejected = [ ['--autoConnect'], ['--auto-connect'], ['--no-autoConnect'], ['--browserUrl=http://127.0.0.1:9222'], ['--wsEndpoint', 'ws://localhost/'], ['-u', 'http://localhost'], ['-w', 'ws://localhost'], ['--headless=false'], ['--user-data-dir=/tmp/daily'], ['--chromeArg=--remote-debugging-port=9222'], ['--executablePath=/bin/false'], ['--isolated'], ['--'], ['--unknown'], ['--help', '--print-config'], ['--help', '--autoConnect'], ['--print-config', '--print-config'] ];
  for (const argv of rejected) {
    let output = '';
    let errors = '';
    assert.equal(await main(argv, { BAODATING_DATA_DIR: root }, { stdout: text => { output += text; }, stderr: text => { errors += text; }, run: () => assert.fail('must not spawn') }), 1, argv.join(' '));
    assert.equal(output, '');
    assert.match(errors, /Unsupported or conflicting/);
  }
  assert.equal(fs.existsSync(root), false);
  const real = spawnSync(process.execPath, [launcher, '--autoConnect'], { env: { ...process.env, BAODATING_DATA_DIR: root }, encoding: 'utf8' });
  assert.equal(real.status, 1);
  assert.equal(real.stdout, '');
});

test('help has no profile side effects, even when configured environment is invalid', async () => {
  let text = '';
  assert.equal(await main(['--help'], { BAODATING_DATA_DIR: 'bad' }, { stdout: value => { text += value; } }), 0);
  assert.match(text, /stdio MCP/);
});

test('child command pins headless, profile, version and no-attach; filters upstream/injection environment', () => {
  const env = { HOME: '/safe/home', PATH: '/safe/bin', LANG: 'zh_CN.UTF-8', HTTPS_PROXY: 'http://proxy:8000', LC_ALL: 'C',
    NODE_OPTIONS: '--require bad.js', NODE_PATH: '/bad', DEBUG: '*', CHROME_CONFIG_HOME: '/daily', XDG_CONFIG_HOME: '/daily',
    PUPPETEER_EXECUTABLE_PATH: '/daily', PUPPETEER_DANGEROUS_NO_SANDBOX: 'true', CHROME_DEVTOOLS_MCP_SESSION_ID: 'daily',
    CHROME_DEVTOOLS_MCP_BROWSER_URL: 'http://daily', CHROME_DEVTOOLS_MCP_USER_DATA_DIR: '/daily',
    npm_config_node_options: '--require bad.js', npm_config_script_shell: '/bad', BAODATING_BROWSER_ARGS: '--autoConnect', SECRET_TOKEN: 'secret' };
  const spec = buildLaunch({ profilePath: '/dedicated/research-profile' }, env);
  assert.equal(spec.command, 'npx');
  assert.deepEqual(spec.args, ['--yes', UPSTREAM, '--headless=true', '--userDataDir=/dedicated/research-profile', '--no-autoConnect', '--no-usage-statistics', '--no-performance-crux']);
  assert.equal(spec.options.stdio, 'inherit');
  assert.equal(spec.options.shell, false);
  assert.equal(spec.options.detached, true);
  assert.deepEqual(childEnvironment(env), { HOME: '/safe/home', PATH: '/safe/bin', LANG: 'zh_CN.UTF-8', HTTPS_PROXY: 'http://proxy:8000', LC_ALL: 'C', CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS: '1', CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: '1', npm_config_loglevel: 'error', npm_config_update_notifier: 'false' });
});

test('profile permissions, provenance, exclusive lock, persistence and failure cleanup', { skip: !supported }, t => {
  const { root } = fixture(t);
  const paths = resolvePaths({ BAODATING_DATA_DIR: root });
  const release = prepareProfile(paths);
  for (const directory of [paths.root, paths.browserDir, paths.profilePath]) assert.equal(mode(directory), 0o700);
  const lock = path.join(paths.browserDir, 'launcher.lock');
  assert.equal(mode(lock), 0o600);
  const marker = path.join(paths.profilePath, '.baodating-research-profile.json');
  assert.equal(mode(marker), 0o600);
  assert.throws(() => prepareProfile(paths), /locked/);
  const state = path.join(paths.profilePath, 'persistent-example');
  fs.writeFileSync(state, 'opaque fixture state', { mode: 0o644 });
  release();
  assert.equal(fs.existsSync(lock), false);
  const releaseAgain = prepareProfile(paths);
  assert.equal(fs.readFileSync(state, 'utf8'), 'opaque fixture state');
  assert.equal(mode(state), 0o600);
  releaseAgain();
  fs.writeFileSync(marker, 'bad marker');
  assert.throws(() => prepareProfile(paths), /marker is invalid/);
  assert.equal(fs.existsSync(lock), false);
});

test('refuse adopting nonempty profiles and profile symlinks/hardlinks without modifying their targets', { skip: !supported }, t => {
  const { base, root } = fixture(t);
  const paths = resolvePaths({ BAODATING_DATA_DIR: root });
  const release = prepareProfile(paths);
  release();
  const target = path.join(base, 'unrelated-file');
  fs.writeFileSync(target, 'do not touch', { mode: 0o644 });
  const entry = path.join(paths.profilePath, 'escape');
  fs.symlinkSync(target, entry);
  assert.throws(() => prepareProfile(paths), /Unsafe profile entry/);
  assert.equal(mode(target), 0o644);
  fs.unlinkSync(entry);
  fs.linkSync(target, entry);
  assert.throws(() => prepareProfile(paths), /Unsafe profile entry/);
  assert.equal(mode(target), 0o644);
  fs.unlinkSync(entry);
  fs.unlinkSync(path.join(paths.profilePath, '.baodating-research-profile.json'));
  fs.writeFileSync(path.join(paths.profilePath, 'Cookies'), 'untrusted fixture');
  assert.throws(() => prepareProfile(paths), /unmarked nonempty profile/);
  assert.equal(fs.existsSync(path.join(paths.browserDir, 'launcher.lock')), false);
});

test('main fails closed on invalid paths and releases lock on child failure without MCP stdout', { skip: !supported }, async t => {
  const { root } = fixture(t);
  let output = '';
  let errors = '';
  let called = false;
  const beforeMask = process.umask();
  t.after(() => process.umask(beforeMask));
  assert.equal(await main([], { BAODATING_DATA_DIR: 'relative' }, { stdout: value => { output += value; }, stderr: value => { errors += value; }, run: () => { called = true; } }), 1);
  assert.equal(called, false);
  const code = await main([], { BAODATING_DATA_DIR: root }, { stdout: value => { output += value; }, stderr: value => { errors += value; }, run: async spec => {
    called = true;
    assert.equal(process.umask(), 0o077);
    assert.match(spec.args[3], /research-profile$/);
    throw new Error('fixture startup error');
  } });
  assert.equal(code, 1);
  assert.equal(called, true);
  assert.equal(output, '');
  assert.match(errors, /fixture startup error/);
  assert.equal(fs.existsSync(path.join(root, 'browser/launcher.lock')), false);
  assert.equal(await main([], { BAODATING_DATA_DIR: root }, { run: async () => 23 }), 23);
  assert.equal(fs.existsSync(path.join(root, 'browser/launcher.lock')), false);
});

test('supervisor propagates child exit and signals, reaps descendants, and removes all listeners', async () => {
  for (const [code, signal, expected] of [[0, null, 0], [23, null, 23], [null, 'SIGKILL', 137]]) {
    const m = mockSupervisor();
    const spec = { command: 'fixture', args: ['arg'], options: { stdio: 'inherit' } };
    const done = superviseChild(spec, m.deps);
    assert.deepEqual(m.calls, [[spec.command, spec.args, spec.options]]);
    m.child.emit('close', code, signal);
    assert.equal(await done, expected);
    assert.deepEqual(m.kills, [[m.child.pid, 'SIGKILL']]);
    assert.equal(m.host.eventNames().length, 0);
    assert.deepEqual(m.reports, []);
  }
});

test('supervisor forwards termination to own process group and escalates after grace period', async () => {
  const m = mockSupervisor();
  const done = superviseChild({}, m.deps);
  m.host.emit('SIGTERM');
  assert.deepEqual(m.kills, [[m.child.pid, 'SIGTERM']]);
  assert.equal(m.timers[0].ms, 7000);
  m.timers[0].fn();
  assert.deepEqual(m.kills[1], [m.child.pid, 'SIGKILL']);
  m.host.emit('SIGINT');
  assert.deepEqual(m.kills[2], [m.child.pid, 'SIGKILL']);
  m.child.emit('close', 0, null);
  assert.equal(await done, 143);
  assert.deepEqual(m.cleared, [m.timers[0]]);
  assert.equal(m.host.eventNames().length, 0);
});

test('supervisor spawn errors fail, and host-exit backstop targets only child process group', async () => {
  for (const throws of [true, false]) {
    const error = Object.assign(new Error('fixture missing executable'), { code: 'ENOENT' });
    const m = mockSupervisor(throws ? { spawnChild: () => { throw error; } } : {});
    if (!throws) m.child.pid = undefined;
    const done = superviseChild({}, m.deps);
    if (!throws) m.child.emit('error', error);
    assert.equal(await done, 127);
    assert.equal(m.host.eventNames().length, 0);
    assert.equal(m.reports.length, 1);
    assert.deepEqual(m.kills, []);
  }
  const m = mockSupervisor();
  const done = superviseChild({}, m.deps);
  m.host.emit('exit');
  assert.deepEqual(m.kills, [[m.child.pid, 'SIGKILL']]);
  m.child.emit('close', 0, null);
  assert.equal(await done, 0);
});

function wrapperSource(childSource) {
  return `import {superviseChild} from ${JSON.stringify(moduleUrl)}; process.exitCode=await superviseChild({command:process.execPath,args:['-e',${JSON.stringify(childSource)}],options:{stdio:'inherit',detached:true,shell:false}});`;
}

test('real Node fixture receives inherited stdin EOF and exit status survives supervision', { skip: !supported }, () => {
  const source = wrapperSource("process.stdin.resume();process.stdin.on('end',()=>process.exit(17));");
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], { input: '', encoding: 'utf8', timeout: 10000 });
  assert.ifError(result.error);
  assert.equal(result.status, 17, result.stderr);
  assert.equal(result.stdout, '');
});

test('real npx-like Node parent exits first and supervisor kills its lingering descendant', { skip: !supported }, t => {
  const childSource = `const {spawn}=require('node:child_process'); console.log('group:'+process.pid); spawn(process.execPath,['-e',"console.log('descendant:'+process.pid);setInterval(()=>{},1000)"],{stdio:'inherit'}); setTimeout(()=>process.exit(29),250);`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', wrapperSource(childSource)], { input: '', encoding: 'utf8', timeout: 5000 });
  const groupPid = /group:(\d+)/.exec(result.stdout)?.[1];
  t.after(() => { if (groupPid) { try { process.kill(-Number(groupPid), 'SIGKILL'); } catch {} } });
  assert.ifError(result.error);
  assert.equal(result.status, 29, result.stderr);
  assert.match(result.stdout, /descendant:\d+/);
  // The descendant inherits stdout: close cannot complete while it remains alive.
  assert.equal(result.stderr, '');
});

test('real Node fixture terminates on launcher signal and no child remains', { skip: !supported, timeout: 10000 }, async t => {
  const source = wrapperSource("process.on('SIGTERM',()=>process.exit(0)); console.log('ready:'+process.pid); setInterval(()=>{},1000);");
  const wrapper = spawn(process.execPath, ['--input-type=module', '-e', source], { stdio: ['pipe', 'pipe', 'pipe'] });
  let fixturePid;
  t.after(() => {
    wrapper.kill('SIGKILL');
    if (fixturePid) { try { process.kill(-fixturePid, 'SIGKILL'); } catch {} }
  });
  let output = '';
  let errors = '';
  wrapper.stderr.on('data', chunk => { errors += chunk; });
  const exited = new Promise((resolve, reject) => { wrapper.once('error', reject); wrapper.once('close', (code, signal) => resolve({ code, signal })); });
  await new Promise((resolve, reject) => {
    wrapper.stdout.on('data', chunk => {
      output += chunk;
      const ready = /ready:(\d+)/.exec(output);
      if (ready) { fixturePid = Number(ready[1]); resolve(); }
    });
    wrapper.once('error', reject);
    wrapper.once('exit', () => { if (!fixturePid) reject(new Error(`fixture exited before ready: ${errors}`)); });
  });
  wrapper.kill('SIGTERM');
  assert.deepEqual(await exited, { code: 143, signal: null });
  assert.throws(() => process.kill(fixturePid, 0), { code: 'ESRCH' });
  assert.equal(errors, '');
});
