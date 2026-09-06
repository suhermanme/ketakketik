#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const PORT = 5173;

// Kill any process on the target port
function killPort(port) {
  try {
    const pids = execSync(`lsof -ti:${port}`, { cwd: rootDir, encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const pid of pids) {
      try { process.kill(parseInt(pid), 'SIGKILL'); } catch {}
    }
  } catch {}
}

async function main() {
  console.log('Starting dev:electron...');

  // Kill any existing process on the target port
  killPort(PORT);

  // Start Vite dev server
  // Note: stdio = ['inherit', 'pipe', 'inherit']
  //   - stdin: inherit (null)
  //   - stdout: pipe (socket)
  //   - stderr: inherit (null)
  const vite = spawn('/opt/homebrew/bin/npx', ['vite'], {
    cwd: rootDir,
    stdio: ['inherit', 'pipe', 'inherit'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  // Only attach to stdout (which is the pipe)
  if (!vite.stdout) {
    console.error('ERROR: vite.stdout is null');
    process.exit(1);
  }

  const devUrl = await new Promise((resolve, reject) => {
    const stripAnsi = (str) => str.replace(/\x1b\[[0-9;]*m/g, '');
    const handler = (chunk) => {
      const str = stripAnsi(chunk.toString());
      const match = str.match(/http:\/\/localhost:(\d+)/);
      if (match) {
        vite.stdout.off('data', handler);
        resolve(`http://localhost:${match[1]}/`);
      }
    };
    vite.stdout.on('data', handler);
    setTimeout(() => reject(new Error('Timeout waiting for Vite to report its port')), 15000);
  });

  console.log(`\nVite dev server ready at ${devUrl}\n`);

  // Launch Electron with the dev URL
  const electron = spawn('electron', ['.'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devUrl,
    },
  });

  const cleanup = () => {
    vite.kill('SIGTERM');
    electron.kill('SIGTERM');
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch(err => {
  console.error('dev:electron failed:', err);
  process.exit(1);
});
