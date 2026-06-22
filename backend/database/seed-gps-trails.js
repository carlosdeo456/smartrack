require('dotenv').config();
const pool = require('../src/config/database');
const { trailBetween } = require('../src/config/tanzaniaRegions');

/** shipment id → trail keyed by tracking number for migration */
const TRAILS_BY_TRACKING = {
  'ST-1001': trailBetween('dar', 'mor', 'dod'),
  'ST-1002': trailBetween('dar', 'mor', 'mwz'),
  'ST-1003': trailBetween('dar', 'aru'),
  'ST-1004': trailBetween('dod', 'mby'),
  'ST-1005': trailBetween('znz', 'tng')
};

async function seedTrails() {
  for (const [tracking, points] of Object.entries(TRAILS_BY_TRACKING)) {
    const ship = await pool.query(
      'SELECT id FROM shipments WHERE tracking_number = $1',
      [tracking]
    );
    if (ship.rows.length === 0) {
      console.log(`Shipment ${tracking} not found. Skipping.`);
      continue;
    }

    const shipmentId = ship.rows[0].id;
    await pool.query('DELETE FROM gps_locations WHERE shipment_id = $1', [shipmentId]);

    for (let i = 0; i < points.length; i++) {
      const [lat, lng] = points[i];
      const minutesAgo = (points.length - i) * 25;
      await pool.query(
        `INSERT INTO gps_locations (shipment_id, latitude, longitude, accuracy, recorded_at)
         VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${minutesAgo} minutes')`,
        [shipmentId, lat, lng, 12]
      );
    }

    console.log(`Added ${points.length} Tanzania GPS points for ${tracking}`);
  }

  await pool.end();
}

seedTrails().catch((err) => {
  console.error('GPS trail seed failed:', err.message);
  process.exit(1);
});
