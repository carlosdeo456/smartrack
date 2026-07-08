require('dotenv').config();
const { Pool } = require('pg');

const SQL = `
ALTER TABLE gps_locations
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'tracker';

UPDATE gps_locations
SET source = 'hub'
WHERE (source IS NULL OR source = 'tracker')
  AND speed IS NULL
  AND altitude IS NULL;

UPDATE gps_locations
SET source = 'tracker'
WHERE source IS NULL;
`;

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(SQL);
    console.log('gps_locations.source column ready.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
