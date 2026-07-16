const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function spawnApp(name, command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false });
  child.on('exit', (code) => {
    if (code) console.log(`${name} stopped with code ${code}`);
  });
  return child;
}

if (!fs.existsSync(path.join(backend, 'node_modules')) || !fs.existsSync(path.join(frontend, 'node_modules'))) {
  console.log('Run npm start first once, or run npm run install-all, to install packages.');
  process.exit(1);
}

console.log('Backend: http://localhost:5000');
console.log('Frontend dev server: http://localhost:5173');
const back = spawnApp('Backend', npmCmd, ['start'], backend);
const front = spawnApp('Frontend', npmCmd, ['run', 'dev'], frontend);

process.on('SIGINT', () => {
  back.kill('SIGINT');
  front.kill('SIGINT');
  process.exit(0);
});
