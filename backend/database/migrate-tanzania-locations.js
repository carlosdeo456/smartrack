/**
 * Moves existing shipment routes & GPS trails to Tanzania regions.
 * Safe to run multiple times.
 */
require('dotenv').config();
const pool = require('../src/config/database');
const { TZ_REGIONS, trailBetween } = require('../src/config/tanzaniaRegions');

const ROUTE_UPDATES = [
  { tracking: 'ST-1001', origin: TZ_REGIONS.dar.name, dest: TZ_REGIONS.dod.name, trail: trailBetween('dar', 'mor', 'dod') },
  { tracking: 'ST-1002', origin: TZ_REGIONS.dar.name, dest: TZ_REGIONS.mwz.name, trail: trailBetween('dar', 'mor', 'mwz') },
  { tracking: 'ST-1003', origin: TZ_REGIONS.dar.name, dest: TZ_REGIONS.aru.name, trail: trailBetween('dar', 'aru') },
  { tracking: 'ST-1004', origin: TZ_REGIONS.dod.name, dest: TZ_REGIONS.mby.name, trail: trailBetween('dod', 'mby'), status: 'in_transit' },
  { tracking: 'ST-1005', origin: TZ_REGIONS.znz.name, dest: TZ_REGIONS.tng.name, trail: trailBetween('znz', 'tng'), status: 'pending' }
];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE users SET full_name = 'James K.', phone = '+255712345678'
       WHERE email = 'driver@smartrack.com'`
    );

    for (const row of ROUTE_UPDATES) {
      let ship = await client.query(
        'SELECT id FROM shipments WHERE tracking_number = $1',
        [row.tracking]
      );

      let id;
      if (ship.rows.length === 0 && row.tracking === 'ST-1004') {
        const driver = await client.query(`SELECT id FROM users WHERE role = 'driver' LIMIT 1`);
        const admin = await client.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
        if (driver.rows.length && admin.rows.length) {
          const ins = await client.query(
            `INSERT INTO shipments (tracking_number, origin_location, destination_location, sender_id, driver_id, status, weight, dimensions, contents, expected_delivery)
             VALUES ($1, $2, $3, $4, $5, 'in_transit', 9.8, '35x28x18 cm', 'Agricultural goods', NOW() + INTERVAL '2 days')
             RETURNING id`,
            [row.tracking, `${row.origin}, Tanzania`, `${row.dest}, Tanzania`, admin.rows[0].id, driver.rows[0].id]
          );
          id = ins.rows[0].id;
          console.log(`+ Created ${row.tracking}`);
        } else continue;
      } else if (ship.rows.length === 0) {
        continue;
      } else {
        id = ship.rows[0].id;
      }

      const origin = `${row.origin}, Tanzania`;
      const dest = `${row.dest}, Tanzania`;

      await client.query(
        `UPDATE shipments SET origin_location = $1, destination_location = $2
         ${row.status ? ', status = $4' : ''}
         WHERE id = $3`,
        row.status ? [origin, dest, id, row.status] : [origin, dest, id]
      );

      await client.query('DELETE FROM gps_locations WHERE shipment_id = $1', [id]);

      for (let i = 0; i < row.trail.length; i++) {
        const [lat, lng] = row.trail[i];
        const minutesAgo = (row.trail.length - i) * 25;
        await client.query(
          `INSERT INTO gps_locations (shipment_id, latitude, longitude, accuracy, recorded_at)
           VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${minutesAgo} minutes')`,
          [id, lat, lng, 12]
        );
      }

      console.log(`✓ ${row.tracking}: ${row.origin} → ${row.dest} (${row.trail.length} GPS points)`);
    }

    await client.query('COMMIT');
    console.log('\nTanzania location migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
