require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../database/schema-items.sql'),
    'utf8'
  );
  await pool.query(sql);
  console.log('Items table ready.');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
