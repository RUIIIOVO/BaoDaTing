#!/usr/bin/env node
/** Standard stdio MCP launcher. No upstream source or browser state is bundled. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const UPSTREAM = 'chrome-devtools-mcp@1.8.0';
const SCRIPT = fileURLToPath(import.meta.url);
const SOURCE_ROOT = path.resolve(path.dirname(SCRIPT), '../../..');
const MARKER = '.baodating-research-profile.json';
const MARKER_TEXT = '{"version":1,"purpose":"baodating-research-only"}\n';
const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'];
const HELP = `BaoDaTing research browser (stdio MCP)\n\n  node /absolute/path/to/skills/baodating/scripts/browser.mjs\n  node /absolute/path/to/skills/baodating/scripts/browser.mjs --print-config\n  node /absolute/path/to/skills/baodating/scripts/browser.mjs --help\n\nNo browser/connection flags are accepted. Headless mode and a dedicated persistent\nprofile are mandatory. BAODATING_DATA_DIR is an absolute data ROOT; the launcher\nalways appends browser/research-profile. Default: \${XDG_DATA_HOME:-~/.local/share}/baodating.\n--print-config validates paths but never creates state or starts a process.\nRequires macOS/Linux, Node supported by chrome-devtools-mcp 1.8.0, npx, and Chrome.\n`;

function fail(message) { throw new Error(message); }
function inside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
function statMaybe(target) {
  try { return fs.lstatSync(target); }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
}
function absoluteClean(value, label) {
  if (typeof value !== 'string' || !value || !path.isAbsolute(value) || /[\x00-\x1f\x7f]/.test(value)) {
    fail(`${label} must be a nonempty absolute path without control characters`);
  }
  if (value.split(path.sep).some(part => part === '..' || part === '.')) fail(`${label} must not contain . or .. components`);
  return path.normalize(value);
}
function components(target) {
  const result = [];
  let current = path.parse(target).root;
  result.push(current);
  for (const part of target.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    result.push(current);
  }
  return result;
}
function checkDirectory(target, { privateDir = false } = {}) {
  const stat = statMaybe(target);
  if (!stat) return;
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`Unsafe directory (symlink or non-directory): ${target}`);
  const uid = process.getuid();
  if (stat.uid !== uid && (privateDir || stat.uid !== 0)) fail(`Directory has another owner: ${target}`);
  // A root-owned sticky temp directory is an acceptable ancestor, never a data root.
  if ((stat.mode & 0o022) && !(stat.uid === 0 && (stat.mode & 0o1000) && !privateDir)) {
    fail(`Directory is writable by other users: ${target}`);
  }
}
function checkNoRepository(target) {
  for (const current of components(target)) {
    if (statMaybe(path.join(current, '.git'))) fail(`Research state must be outside Git repositories: ${target}`);
  }
  // Also protect an exported source tree with no .git metadata.
  if (inside(target, SOURCE_ROOT)) fail('Research state must be outside the BaoDaTing source tree');
}
function canonicalDataRoot(root) {
  // macOS /tmp -> /private/tmp is a legitimate ancestor alias. Canonicalize
  // ancestors, but never accept a symlink at the dedicated root itself.
  if (statMaybe(root)?.isSymbolicLink()) fail('Dedicated data root must not be a symlink');
  let existing = root;
  while (!statMaybe(existing)) existing = path.dirname(existing);
  return path.join(fs.realpathSync.native(existing), path.relative(existing, root));
}
function checkDailyBrowser(target) {
  const value = target.replaceAll('\\', '/').toLowerCase();
  const common = /(?:^|\/)(?:google-chrome(?:-[^/]*)?|chromium|chrome-devtools-mcp(?:-cli)?|brave-browser|microsoft-edge)(?:\/|$)/;
  const mac = /\/library\/application support\/(?:google\/chrome[^/]*|chromium|bravesoftware|microsoft edge[^/]*)(?:\/|$)/;
  const windows = /\/appdata\/(?:local|roaming)\/(?:google|chromium|microsoft\/edge|bravesoftware)(?:\/|$)/;
  if (common.test(value) || mac.test(value) || windows.test(value)) fail('Daily/shared browser directories are forbidden');
}

/** Pure with respect to writes: safe for --print-config and offline inspection. */
export function resolvePaths(env = process.env, home = os.homedir()) {
  if (!['darwin', 'linux'].includes(process.platform)) fail('This launcher requires macOS/Linux POSIX ownership and process groups');
  const homePath = absoluteClean(home, 'Home directory');
  let root;
  if (env.BAODATING_DATA_DIR !== undefined) root = absoluteClean(env.BAODATING_DATA_DIR, 'BAODATING_DATA_DIR');
  else {
    const base = env.XDG_DATA_HOME === undefined ? path.join(homePath, '.local/share') : absoluteClean(env.XDG_DATA_HOME, 'XDG_DATA_HOME');
    root = path.join(base, 'baodating');
  }
  checkNoRepository(path.join(root, 'browser/research-profile'));
  checkDailyBrowser(root);
  root = canonicalDataRoot(root);
  const canonicalHome = statMaybe(homePath) ? fs.realpathSync.native(homePath) : homePath;
  const broadRoots = [canonicalHome, fs.realpathSync.native(os.tmpdir()), ...['Desktop', 'Documents', 'Downloads', 'Library', '.config', '.cache', '.local', '.ssh', '.gnupg'].map(name => path.join(canonicalHome, name))];
  if (root === path.parse(root).root || broadRoots.includes(root) || components(root).length < 3) fail('Data root must be a dedicated directory');
  if (/^\/(?:private\/)?(?:etc|usr|bin|sbin|lib[^/]*|System|Applications|dev|proc|sys|run)(?:\/|$)/i.test(root)) fail('System directories cannot store research state');
  const browserDir = path.join(root, 'browser');
  const profilePath = path.join(browserDir, 'research-profile');
  checkNoRepository(profilePath);
  checkDailyBrowser(profilePath);
  for (const target of components(profilePath)) checkDirectory(target, { privateDir: inside(target, root) });
  return { root, browserDir, profilePath };
}

/** Only ordinary runtime/locale/proxy variables survive. No arbitrary upstream env passthrough. */
export function childEnvironment(env = process.env) {
  const result = {};
  const allowed = /^(?:HOME|PATH|TMPDIR|TMP|TEMP|LANG|LANGUAGE|LC_[A-Z_]+|TZ|HTTP_PROXY|HTTPS_PROXY|ALL_PROXY|NO_PROXY|http_proxy|https_proxy|all_proxy|no_proxy|SSL_CERT_FILE|SSL_CERT_DIR)$/;
  for (const [key, value] of Object.entries(env)) if (allowed.test(key) && value !== undefined) result[key] = value;
  result.CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS = '1';
  result.CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS = '1';
  // npm's child can otherwise inherit node-options/script-shell from npm config env.
  result.npm_config_loglevel = 'error';
  result.npm_config_update_notifier = 'false';
  return result;
}

export function buildLaunch(paths, env = process.env) {
  return {
    command: 'npx',
    args: ['--yes', UPSTREAM, '--headless=true', `--userDataDir=${paths.profilePath}`, '--no-autoConnect', '--no-usage-statistics', '--no-performance-crux'],
    options: { stdio: 'inherit', detached: true, shell: false, env: childEnvironment(env) },
  };
}
export function configuration(paths) {
  return {
    command: process.execPath,
    args: [SCRIPT],
    env: { BAODATING_DATA_DIR: paths.root },
    profilePath: paths.profilePath,
    profileNote: 'Dedicated persistent research profile; created only when MCP runs. Never imports daily browser state.',
  };
}

function privateDirectory(target) {
  checkDirectory(target, { privateDir: true });
  if (!statMaybe(target)) fs.mkdirSync(target, { mode: 0o700 });
  checkDirectory(target, { privateDir: true });
  fs.chmodSync(target, 0o700);
}
function validateTree(target) {
  const stat = fs.lstatSync(target);
  if (stat.uid !== process.getuid() || stat.isSymbolicLink()) fail(`Unsafe profile entry: ${target}`);
  if (stat.isDirectory()) {
    if (stat.mode & 0o022) fail(`Profile directory is writable by other users: ${target}`);
    fs.chmodSync(target, 0o700);
    for (const name of fs.readdirSync(target)) validateTree(path.join(target, name));
  } else if (stat.isFile() && stat.nlink === 1) {
    if (stat.mode & 0o022) fail(`Profile file is writable by other users: ${target}`);
    fs.chmodSync(target, 0o600);
  } else fail(`Unsafe profile entry (link or special file): ${target}`);
}
function writePrivate(target, text) {
  const fd = fs.openSync(target, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
  try { fs.writeFileSync(fd, text); } finally { fs.closeSync(fd); }
}

/** Lock is deliberately not auto-recovered: a stale lock needs human verification. */
export function prepareProfile(paths) {
  // Revalidate after configuration was built, before performing any write.
  const checked = resolvePaths({ BAODATING_DATA_DIR: paths.root });
  if (checked.profilePath !== paths.profilePath || checked.browserDir !== paths.browserDir) fail('Inconsistent profile paths');
  for (const target of components(paths.root)) {
    if (!statMaybe(target)) privateDirectory(target);
  }
  privateDirectory(paths.root);
  privateDirectory(paths.browserDir);
  const lockPath = path.join(paths.browserDir, 'launcher.lock');
  let lock;
  try {
    const fd = fs.openSync(lockPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    try {
      fs.writeFileSync(fd, `${process.pid}\n`);
      lock = fs.fstatSync(fd);
    } finally { fs.closeSync(fd); }
  } catch (error) {
    if (error.code === 'EEXIST') fail(`Research profile is locked; stop its owner before retrying: ${lockPath}`);
    throw error;
  }
  const release = () => {
    const current = statMaybe(lockPath);
    if (current && !current.isSymbolicLink() && current.ino === lock.ino && current.dev === lock.dev) fs.unlinkSync(lockPath);
  };
  try {
    privateDirectory(paths.profilePath);
    const marker = path.join(paths.profilePath, MARKER);
    if (!statMaybe(marker)) {
      if (fs.readdirSync(paths.profilePath).length) fail('Refusing an unmarked nonempty profile; use a new dedicated data root');
      writePrivate(marker, MARKER_TEXT);
    }
    validateTree(paths.profilePath);
    if (fs.readFileSync(marker, 'utf8') !== MARKER_TEXT) fail('Research profile marker is invalid');
    return release;
  } catch (error) { release(); throw error; }
}

function signalCode(signal) { return 128 + (os.constants.signals[signal] ?? 1); }

/** Injectable process boundary for offline tests. There is no CLI bypass. */
export function superviseChild(spec, {
  spawnChild = spawn,
  host = process,
  killGroup = (pid, signal) => { try { process.kill(-pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; } },
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  shutdownMs = 7000,
  report = message => process.stderr.write(`${message}\n`),
} = {}) {
  return new Promise(resolve => {
    let child;
    let timer;
    let requestedSignal;
    let finished = false;
    const kill = signal => {
      if (!child?.pid) return;
      try { killGroup(child.pid, signal); }
      catch (error) { report(`BaoDaTing: could not signal research process group: ${error.message}`); }
    };
    const onHostExit = () => kill('SIGKILL');
    const handlers = new Map(SIGNALS.map(signal => [signal, () => {
      if (requestedSignal) { kill('SIGKILL'); return; }
      requestedSignal = signal;
      kill(signal);
      timer = setTimer(() => kill('SIGKILL'), shutdownMs);
    }]));
    const finish = code => {
      if (finished) return;
      finished = true;
      if (timer !== undefined) clearTimer(timer);
      // npx can exit before a descendant does. Reap only this new process group.
      kill('SIGKILL');
      for (const [signal, handler] of handlers) host.removeListener(signal, handler);
      host.removeListener('exit', onHostExit);
      resolve(requestedSignal ? signalCode(requestedSignal) : code);
    };
    for (const [signal, handler] of handlers) host.on(signal, handler);
    host.on('exit', onHostExit);
    try { child = spawnChild(spec.command, spec.args, spec.options); }
    catch (error) {
      report(`BaoDaTing: failed to start MCP: ${error.message}`);
      finish(error.code === 'ENOENT' ? 127 : 1);
      return;
    }
    child.once('error', error => {
      report(`BaoDaTing: failed to start MCP: ${error.message}`);
      finish(error.code === 'ENOENT' ? 127 : 1);
    });
    child.once('close', (code, signal) => finish(signal ? signalCode(signal) : (code ?? 1)));
  });
}

export async function main(argv = process.argv.slice(2), env = process.env, {
  stdout = text => process.stdout.write(text),
  stderr = text => process.stderr.write(text),
  run = superviseChild,
} = {}) {
  let release;
  try {
    if (argv.length > 1 || (argv.length === 1 && !['--help', '--print-config'].includes(argv[0]))) {
      fail('Unsupported or conflicting arguments; only --help or --print-config may be supplied');
    }
    if (argv[0] === '--help') { stdout(HELP); return 0; }
    const paths = resolvePaths(env);
    if (argv[0] === '--print-config') {
      stdout(`${JSON.stringify(configuration(paths), null, 2)}\n`);
      return 0;
    }
    // Child processes inherit umask, so new Chrome files are private as well.
    process.umask(0o077);
    release = prepareProfile(paths);
    return await run(buildLaunch(paths, env));
  } catch (error) {
    stderr(`BaoDaTing: ${error.message}\n`);
    return 1;
  } finally { release?.(); }
}

function isEntrypoint() {
  if (!process.argv[1]) return false;
  try { return import.meta.url === pathToFileURL(fs.realpathSync.native(path.resolve(process.argv[1]))).href; }
  catch { return false; }
}
if (isEntrypoint()) {
  process.exitCode = await main();
}
