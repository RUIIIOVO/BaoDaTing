#!/usr/bin/env node
/** Portable stdio launcher; device automation belongs to upstream Mobile MCP. */
import { spawn } from 'node:child_process';
import { constants } from 'node:os';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

export const UPSTREAM_VERSION = '1.0.14';
export const MCP_CONFIG = Object.freeze({
  command: 'npx',
  args: Object.freeze(['--yes', `@mobilenext/mobile-mcp@${UPSTREAM_VERSION}`]),
  env: Object.freeze({ MOBILEMCP_DISABLE_TELEMETRY: '1' }),
});
const HELP = `Usage: node skills/baodating/scripts/mobile.mjs [mode]
  (no arguments)          Launch pinned Mobile MCP over stdio
  --print-config         Print portable command/args JSON; no probes/network
  --doctor [--json] [--device ID] [--timeout-ms N]
                         Check adb version and device states (Android only)
                         N: 100..5000 ms per probe; default 1500
  --help                 Show this help
--device is a doctor selector only, not a server-side device restriction.
`;

export function parseArgs(args) {
  const options = { mode: 'launch', json: false, timeoutMs: 1500 };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (!['--print-config', '--doctor', '--json', '--device', '--timeout-ms', '--help'].includes(flag)) {
      throw new Error('Unknown argument; use --help.');
    }
    if (seen.has(flag)) throw new Error('Duplicate argument; use --help.');
    seen.add(flag);
    if (['--print-config', '--doctor', '--help'].includes(flag)) {
      if (options.mode !== 'launch') throw new Error('Choose one mode.');
      options.mode = flag.slice(2);
    } else if (flag === '--json') {
      options.json = true;
    } else {
      const value = args[++index];
      if (!value || value.startsWith('-')) throw new Error('Missing option value.');
      if (flag === '--device') {
        if (/\s|\x00/.test(value)) throw new Error('Invalid device ID.');
        options.device = value;
      } else {
        if (!/^\d+$/.test(value) || Number(value) < 100 || Number(value) > 5000) {
          throw new Error('--timeout-ms must be an integer from 100 to 5000.');
        }
        options.timeoutMs = Number(value);
      }
    }
  }
  if (options.mode !== 'doctor' && ['--json', '--device', '--timeout-ms'].some(flag => seen.has(flag))) {
    throw new Error('--json, --device and --timeout-ms require --doctor.');
  }
  return options;
}

// Only signal the process group created for this child, never an existing adb server.
function signalChild(child, signal) {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}

/** Output and wall time are bounded, even when descendants retain pipe handles. */
export function probe(command, args, timeoutMs, { spawnProcess = spawn } = {}) {
  return new Promise(resolveProbe => {
    let child;
    let timer;
    let finishTimer;
    let settled = false;
    let failure;
    let stdout = '';
    let bytes = 0;
    const listeners = new Map();
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(finishTimer);
      for (const [signal, listener] of listeners) process.removeListener(signal, listener);
      child?.stdout?.destroy();
      child?.stderr?.destroy();
      resolveProbe(result);
    };
    const stop = reason => {
      if (failure) return;
      failure = reason;
      signalChild(child, 'SIGTERM');
      finishTimer = setTimeout(() => {
        signalChild(child, 'SIGKILL');
        finish({ status: failure });
      }, 200);
    };
    try {
      child = spawnProcess(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32', shell: false,
      });
    } catch {
      finish({ status: 'spawn-error' });
      return;
    }
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
      const listener = () => stop('interrupted');
      listeners.set(signal, listener);
      process.on(signal, listener);
    }
    child.once('error', error => finish({ status: error.code === 'ENOENT' ? 'missing' : 'spawn-error' }));
    for (const [stream, keep] of [[child.stdout, true], [child.stderr, false]]) {
      stream.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > 65536) stop('output-limit');
        else if (keep) stdout += chunk.toString();
      });
    }
    child.once('close', (code, signal) => {
      // On cancellation keep the short kill timer: npm/adb descendants may remain.
      if (failure) return;
      finish({ status: code === 0 && !signal ? 'ok' : 'error', code, stdout });
    });
    timer = setTimeout(() => stop('timeout'), timeoutMs);
  });
}

export function parseDevices(stdout) {
  const lines = stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const header = lines.indexOf('List of devices attached');
  if (header !== 0) throw new Error('Missing or invalid adb devices header.');
  const devices = [];
  for (const line of lines.slice(header + 1)) {
    const match = /^(\S+)\s+(device|unauthorized|offline|no permissions|recovery|sideload|bootloader|connecting|authorizing|unknown)(?:\s|$)/.exec(line);
    if (!match) throw new Error('Unrecognized adb device row.');
    if (devices.some(device => device.id === match[1])) throw new Error('Duplicate adb device row.');
    devices.push({ id: match[1], state: match[2] });
  }
  return devices;
}

export async function doctor(options, { runProbe = probe } = {}) {
  const base = { ok: false, platform: 'android', upstreamVersion: UPSTREAM_VERSION, timeoutMs: options.timeoutMs };
  const version = await runProbe('adb', ['version'], options.timeoutMs);
  const failure = (result, stage) => ({ ...base, status: result.status === 'missing' ? 'adb-missing' : result.status === 'error' || result.status === 'spawn-error' ? 'adb-error' : result.status, stage });
  if (version.status !== 'ok') return failure(version, 'adb-version');
  if (!/^Android Debug Bridge version /m.test(version.stdout)) return { ...base, status: 'invalid-output', stage: 'adb-version' };
  const listing = await runProbe('adb', ['devices', '-l'], options.timeoutMs);
  if (listing.status !== 'ok') return failure(listing, 'adb-devices');
  let devices;
  try { devices = parseDevices(listing.stdout); }
  catch { return { ...base, status: 'invalid-output', stage: 'adb-devices' }; }
  const counts = { total: devices.length, ready: 0, unauthorized: 0, offline: 0, other: 0 };
  for (const device of devices) {
    counts[device.state === 'device' ? 'ready' : ['unauthorized', 'offline'].includes(device.state) ? device.state : 'other']++;
  }
  const result = { ...base, counts, explicitDevice: Boolean(options.device) };
  if (!devices.length) return { ...result, status: 'absent' };
  if (!options.device && devices.length > 1) return { ...result, status: 'multiple', action: 'Pass --device ID; use the same explicit device in MCP calls.' };
  const selected = options.device ? devices.find(device => device.id === options.device) : devices[0];
  if (!selected) return { ...result, status: 'device-not-found' };
  const status = selected.state === 'device' ? 'ready' : ['unauthorized', 'offline'].includes(selected.state) ? selected.state : 'unavailable';
  return { ...result, ok: status === 'ready', status };
}

/** Preserve protocol stdio and reap the npx process group on exit or interruption. */
export function launch({ spawnProcess = spawn, shutdownMs = 500 } = {}) {
  if (!['darwin', 'linux'].includes(process.platform)) {
    process.stderr.write('mobile: this launcher supports macOS/Linux; use --print-config for direct upstream MCP configuration.\n');
    return Promise.resolve(2);
  }
  return new Promise(resolveLaunch => {
    let child;
    let cleanupTimer;
    let finished = false;
    let requestedSignal;
    let exitCode;
    const listeners = new Map();
    const finish = code => {
      if (finished) return;
      finished = true;
      clearTimeout(cleanupTimer);
      for (const [signal, listener] of listeners) process.removeListener(signal, listener);
      resolveLaunch(code);
    };
    const clean = () => {
      if (cleanupTimer) return;
      cleanupTimer = setTimeout(() => {
        signalChild(child, 'SIGKILL');
        finish(requestedSignal ? 128 + constants.signals[requestedSignal] : exitCode ?? 1);
      }, shutdownMs);
    };
    try {
      child = spawnProcess(MCP_CONFIG.command, [...MCP_CONFIG.args], {
        stdio: 'inherit', detached: process.platform !== 'win32', shell: false,
        env: { ...process.env, ...MCP_CONFIG.env },
      });
    } catch {
      process.stderr.write('mobile: could not start npx.\n');
      finish(127);
      return;
    }
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
      const listener = () => {
        requestedSignal ??= signal;
        signalChild(child, signal);
        clean();
      };
      listeners.set(signal, listener);
      process.on(signal, listener);
    }
    child.once('error', () => {
      process.stderr.write('mobile: could not start npx. Check Node.js/npm on PATH.\n');
      finish(127);
    });
    child.once('exit', (code, signal) => {
      exitCode = signal ? 128 + (constants.signals[signal] ?? 1) : code ?? 1;
      signalChild(child, 'SIGTERM');
      clean();
    });
  });
}

export async function main(args = process.argv.slice(2)) {
  let options;
  try { options = parseArgs(args); }
  catch (error) {
    process.stderr.write(`mobile: ${error.message}\n`);
    return 2;
  }
  if (options.mode === 'help') { process.stdout.write(HELP); return 0; }
  if (options.mode === 'print-config') {
    process.stdout.write(`${JSON.stringify(MCP_CONFIG, null, 2)}\n`);
    return 0;
  }
  if (options.mode === 'doctor') {
    const result = await doctor(options);
    const output = options.json ? JSON.stringify(result) : `Android doctor: ${result.status}; ${result.counts ? `${result.counts.total} device(s), ${result.counts.ready} ready. ` : ''}${result.action ?? ''}`;
    process.stdout.write(`${output}\n`);
    return result.ok ? 0 : 1;
  }
  return launch();
}

// Resolve symlinks for skill installations, while imports remain side-effect free.
function isEntrypoint() {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
if (isEntrypoint()) {
  process.exitCode = await main();
}
