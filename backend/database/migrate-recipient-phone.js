require('dotenv').config();
const pool = require('../src/config/database');

async function migrate() {
  await pool.query(
    'ALTER TABLE shipments ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(20)'
  );
  console.log('Added recipient_phone column to shipments (if missing).');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
