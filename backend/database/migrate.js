require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { getPoolConfig } = require('../src/config/poolConfig');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env and configure it.');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const pool = new Pool(getPoolConfig());

  try {
    await pool.query(sql);
    console.log('Database schema applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
