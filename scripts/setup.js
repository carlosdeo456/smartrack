const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');

function copyEnvExample(dir) {
  const example = path.join(root, dir, '.env.example');
  const env = path.join(root, dir, '.env');

  if (!fs.existsSync(env) && fs.existsSync(example)) {
    fs.copyFileSync(example, env);
    console.log(`Created ${dir}/.env from .env.example`);
  }
}

console.log('Installing dependencies...\n');
execSync('npm install --prefix backend', { stdio: 'inherit', cwd: root });
execSync('npm install --prefix frontend', { stdio: 'inherit', cwd: root });

copyEnvExample('backend');
copyEnvExample('frontend');

console.log('\nSetup complete!\n');
console.log('Next steps:');
console.log('  1. Edit backend/.env with your PostgreSQL connection string');
console.log('  2. Create the database (e.g. createdb smartrack or via pgAdmin)');
console.log('  3. Apply schema:  npm run migrate');
console.log('  4. Start app:      npm run dev');
console.log('\nApp URLs:');
console.log('  Frontend:  http://localhost:3000');
console.log('  Backend:   http://localhost:5000');
