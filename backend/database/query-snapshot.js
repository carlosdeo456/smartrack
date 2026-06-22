require('dotenv').config();
const pool = require('../src/config/database');

async function snapshot() {
  const counts = await pool.query(`
    SELECT 'users' AS table_name, COUNT(*)::int AS rows FROM users
    UNION ALL SELECT 'shipments', COUNT(*)::int FROM shipments
    UNION ALL SELECT 'gps_locations', COUNT(*)::int FROM gps_locations
    UNION ALL SELECT 'sensor_data', COUNT(*)::int FROM sensor_data
    UNION ALL SELECT 'rfid_scans', COUNT(*)::int FROM rfid_scans
    UNION ALL SELECT 'alerts', COUNT(*)::int FROM alerts
    UNION ALL SELECT 'notifications', COUNT(*)::int FROM notifications
    UNION ALL SELECT 'routes', COUNT(*)::int FROM routes
    UNION ALL SELECT 'audit_logs', COUNT(*)::int FROM audit_logs
  `);

  const users = await pool.query(
    'SELECT id, email, full_name, role, phone, is_active FROM users ORDER BY id'
  );

  const shipments = await pool.query(`
    SELECT s.id, s.tracking_number, s.origin_location, s.destination_location,
           s.status, s.weight, s.contents, u.full_name AS driver,
           s.expected_delivery, s.actual_delivery
    FROM shipments s
    LEFT JOIN users u ON s.driver_id = u.id
    ORDER BY s.id
  `);

  const alerts = await pool.query(`
    SELECT a.id, s.tracking_number, a.alert_type, a.severity, a.title,
           a.is_resolved, a.created_at
    FROM alerts a
    LEFT JOIN shipments s ON a.shipment_id = s.id
    ORDER BY a.id
  `);

  const sensors = await pool.query(`
    SELECT sd.id, s.tracking_number, sd.temperature, sd.humidity,
           sd.pressure, sd.recorded_at
    FROM sensor_data sd
    JOIN shipments s ON sd.shipment_id = s.id
    ORDER BY sd.recorded_at DESC
  `);

  const rfid = await pool.query(`
    SELECT r.id, s.tracking_number, r.rfid_tag_id, r.checkpoint_name, r.scan_time
    FROM rfid_scans r
    JOIN shipments s ON r.shipment_id = s.id
    ORDER BY r.scan_time DESC
    LIMIT 20
  `);

  const notifications = await pool.query(`
    SELECT n.id, u.email, n.message, n.is_read, n.created_at
    FROM notifications n
    JOIN users u ON n.user_id = u.id
    ORDER BY n.created_at DESC
    LIMIT 20
  `);

  console.log(JSON.stringify({
    counts: counts.rows,
    users: users.rows,
    shipments: shipments.rows,
    alerts: alerts.rows,
    sensors: sensors.rows,
    rfid: rfid.rows,
    notifications: notifications.rows
  }));

  await pool.end();
}

snapshot().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
