/**
 * On Render (RENDER=true), ensure schema + default users exist before serving.
 * Safe to run on every deploy — migrations are idempotent.
 */
const { execSync } = require('child_process');

async function cloudBoot() {
  if (process.env.NODE_ENV !== 'production' || process.env.RENDER !== 'true') {
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('Cloud boot: DATABASE_URL is missing — set it in Render Environment');
    return;
  }

  try {
    const { hostname } = new URL(process.env.DATABASE_URL);
    console.log(`Cloud boot: database host ${hostname}`);
  } catch {
    console.error('Cloud boot: DATABASE_URL is not a valid URL');
    return;
  }

  const steps = [
    'node database/migrate.js',
    'node database/migrate-iot-assignments.js',
    'node database/migrate-gps-source.js',
    'node database/migrate-items.js',
    'node database/seed-users.js',
  ];

  console.log('Cloud boot: preparing database...');

  for (const cmd of steps) {
    try {
      execSync(cmd, { stdio: 'inherit', cwd: __dirname + '/..' });
    } catch (err) {
      console.error(`Cloud boot step failed (${cmd}):`, err.message);
      return;
    }
  }

  console.log('Cloud boot: database ready');
}

cloudBoot()
  .then(() => require('../src/server.js'))
  .catch((err) => {
    console.error('Cloud boot fatal:', err);
    process.exit(1);
  });
