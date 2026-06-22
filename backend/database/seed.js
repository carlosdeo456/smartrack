require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');
const { TZ_REGIONS, trailBetween } = require('../src/config/tanzaniaRegions');

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT COUNT(*)::int AS count FROM shipments');
    if (existing.rows[0].count > 0) {
      console.log('Database already has shipments. Skipping seed.');
      console.log('Run: npm run seed:tanzania --prefix backend  to move existing data to Tanzania.');
      await client.query('ROLLBACK');
      return;
    }

    const adminHash = await bcrypt.hash('admin123', 10);
    const driverHash = await bcrypt.hash('driver123', 10);

    const admin = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['admin@smartrack.com', adminHash, 'Admin User', 'admin']
    );

    const driver = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['driver@smartrack.com', driverHash, 'James K.', 'driver', '+255712345678']
    );

    const shipments = [
      {
        tracking_number: 'ST-1001',
        origin_location: `${TZ_REGIONS.dar.name}, Tanzania`,
        destination_location: `${TZ_REGIONS.dod.name}, Tanzania`,
        status: 'in_transit',
        weight: 12.5,
        dimensions: '40x30x20 cm',
        contents: 'Electronics',
        trail: trailBetween('dar', 'mor', 'dod')
      },
      {
        tracking_number: 'ST-1002',
        origin_location: `${TZ_REGIONS.dar.name}, Tanzania`,
        destination_location: `${TZ_REGIONS.mwz.name}, Tanzania`,
        status: 'in_transit',
        weight: 8.2,
        dimensions: '30x25x15 cm',
        contents: 'Medical supplies',
        trail: trailBetween('dar', 'mor', 'mwz')
      },
      {
        tracking_number: 'ST-1003',
        origin_location: `${TZ_REGIONS.dar.name}, Tanzania`,
        destination_location: `${TZ_REGIONS.aru.name}, Tanzania`,
        status: 'delivered',
        weight: 5.0,
        dimensions: '25x20x10 cm',
        contents: 'Documents',
        trail: trailBetween('dar', 'aru')
      },
      {
        tracking_number: 'ST-1004',
        origin_location: `${TZ_REGIONS.dod.name}, Tanzania`,
        destination_location: `${TZ_REGIONS.mby.name}, Tanzania`,
        status: 'in_transit',
        weight: 9.8,
        dimensions: '35x28x18 cm',
        contents: 'Agricultural goods',
        trail: trailBetween('dod', 'mby')
      },
      {
        tracking_number: 'ST-1005',
        origin_location: `${TZ_REGIONS.znz.name}, Tanzania`,
        destination_location: `${TZ_REGIONS.tng.name}, Tanzania`,
        status: 'pending',
        weight: 3.2,
        dimensions: '20x15x10 cm',
        contents: 'Spices',
        trail: [[TZ_REGIONS.znz.lat, TZ_REGIONS.znz.lng]]
      }
    ];

    for (const item of shipments) {
      const shipment = await client.query(
        `INSERT INTO shipments (
          tracking_number, origin_location, destination_location,
          sender_id, driver_id, status, weight, dimensions, contents,
          expected_delivery
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '2 days')
        RETURNING id`,
        [
          item.tracking_number,
          item.origin_location,
          item.destination_location,
          admin.rows[0].id,
          driver.rows[0].id,
          item.status,
          item.weight,
          item.dimensions,
          item.contents
        ]
      );

      const sid = shipment.rows[0].id;
      for (let i = 0; i < item.trail.length; i++) {
        const [lat, lng] = item.trail[i];
        const minutesAgo = (item.trail.length - i) * 25;
        await client.query(
          `INSERT INTO gps_locations (shipment_id, latitude, longitude, accuracy, recorded_at)
           VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${minutesAgo} minutes')`,
          [sid, lat, lng, 12]
        );
      }

      await client.query(
        `INSERT INTO sensor_data (shipment_id, temperature, humidity, sensor_id, recorded_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [sid, 24.5, 62, `SENSOR-${item.tracking_number}`]
      );
    }

    await client.query('COMMIT');
    console.log('Tanzania sample data seeded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
