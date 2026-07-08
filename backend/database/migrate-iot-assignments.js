require('dotenv').config();
const { Pool } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS iot_device_assignments (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(100) NOT NULL,
  shipment_id INT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unassigned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_iot_assignments_shipment_time
  ON iot_device_assignments(shipment_id, assigned_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_iot_assignments_active_device
  ON iot_device_assignments (LOWER(device_id))
  WHERE unassigned_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_iot_assignments_active_shipment
  ON iot_device_assignments (shipment_id)
  WHERE unassigned_at IS NULL;
`;

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(SQL);
    console.log('iot_device_assignments table ready.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
