require('dotenv').config();
const pool = require('../src/config/database');

async function migrate() {
  await pool.query(
    'ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255)'
  );
  await pool.query(
    'ALTER TABLE shipments ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255)'
  );
  console.log('Added sender_name and recipient_name columns to shipments.');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
