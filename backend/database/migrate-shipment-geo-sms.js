require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/database');

async function migrate() {
  await pool.query(`
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(20);
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS origin_latitude DECIMAL(10, 8);
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS origin_longitude DECIMAL(11, 8);
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS destination_latitude DECIMAL(10, 8);
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS destination_longitude DECIMAL(11, 8);
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS planned_route JSONB;
  `);
  console.log('Shipment geo + sender_phone columns ready.');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
