const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const nodeCmd = isWindows ? 'node.exe' : 'node';

function run(command, args, cwd, label) {
  console.log(`\n[Eco Scan] ${label}...`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    console.error(`\n[Eco Scan] Failed: ${label}`);
    process.exit(result.status || 1);
  }
}

function ensureDependencies() {
  if (!fs.existsSync(path.join(backend, 'node_modules'))) {
    run(npmCmd, ['install'], backend, 'Installing backend packages');
  }
  if (!fs.existsSync(path.join(frontend, 'node_modules'))) {
    run(npmCmd, ['install'], frontend, 'Installing frontend packages');
  }
}

function ensureBuild() {
  const distIndex = path.join(frontend, 'dist', 'index.html');
  if (!fs.existsSync(distIndex)) {
    run(npmCmd, ['run', 'build'], frontend, 'Building hospital frontend');
  }
}

ensureDependencies();
ensureBuild();

console.log('\n[Eco Scan] Starting full website...');
console.log('[Eco Scan] Open this URL in your browser: http://localhost:5000');
console.log('[Eco Scan] Admin: admin@ecoscan.com / admin123');
console.log('[Eco Scan] Patient: patient@ecoscan.com / patient123\n');

const child = spawn(nodeCmd, [path.join(backend, 'server.js')], {
  cwd: backend,
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT || '5000' },
  shell: false
});

child.on('exit', (code) => process.exit(code || 0));
