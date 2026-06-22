const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { saveLocation, getLocationHistory } = require('../services/gpsService');
const { resolveShipmentRoute } = require('../services/geocodingService');
const { sendShipmentSmsToParties } = require('../services/smsService');
const {
  generateUniqueTrackingId,
  isValidTrackingId,
  buildTrackingLinks,
  normalizeTrackingNumber,
} = require('../services/trackingIdService');

const router = express.Router();

const shipmentSelect = `
  SELECT
    s.*,
    sender.full_name AS sender_account_name,
    sender.phone AS account_sender_phone,
    sender.email AS sender_email,
    d.full_name AS driver_name,
    d.phone AS driver_phone,
    gl.latitude AS latest_latitude,
    gl.longitude AS latest_longitude,
    gl.recorded_at AS latest_location_at,
    gl.accuracy AS latest_accuracy
  FROM shipments s
  LEFT JOIN users sender ON sender.id = s.sender_id
  LEFT JOIN users d ON d.id = s.driver_id
  LEFT JOIN LATERAL (
    SELECT latitude, longitude, recorded_at, accuracy
    FROM gps_locations
    WHERE shipment_id = s.id
    ORDER BY recorded_at DESC
    LIMIT 1
  ) gl ON true
`;

function formatShipment(row) {
  const shipment = { ...row };

  if (!shipment.sender_phone && row.account_sender_phone) {
    shipment.sender_phone = row.account_sender_phone;
  }
  delete shipment.account_sender_phone;

  if (shipment.planned_route && typeof shipment.planned_route === 'string') {
    try {
      shipment.planned_route = JSON.parse(shipment.planned_route);
    } catch {
      shipment.planned_route = null;
    }
  }

  if (row.latest_latitude != null && row.latest_longitude != null) {
    shipment.currentLocation = {
      shipmentId: row.id,
      latitude: parseFloat(row.latest_latitude),
      longitude: parseFloat(row.latest_longitude),
      recordedAt: row.latest_location_at,
      accuracy: row.latest_accuracy != null ? parseFloat(row.latest_accuracy) : null,
    };
  }

  delete shipment.latest_latitude;
  delete shipment.latest_longitude;
  delete shipment.latest_location_at;
  delete shipment.latest_accuracy;

  if (shipment.tracking_number) {
    shipment.tracking_number = normalizeTrackingNumber(shipment.tracking_number);
  }

  return shipment;
}

router.post('/', auth, async (req, res) => {
  const {
    tracking_number,
    origin_location,
    destination_location,
    status = 'pending',
    weight,
    dimensions,
    contents,
    sender_name,
    recipient_name,
    recipient_phone,
    sender_phone,
    driver_id,
    expected_delivery,
    latitude,
    longitude,
  } = req.body;

  if (!origin_location || !destination_location) {
    return res.status(400).json({ error: 'Origin and destination are required' });
  }

  const validStatuses = ['pending', 'in_transit', 'delivered', 'failed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const senderId = req.user.id;

  const trackingNumber = tracking_number
    ? normalizeTrackingNumber(tracking_number)
    : await generateUniqueTrackingId(pool, senderId);

  if (tracking_number && !isValidTrackingId(trackingNumber)) {
    return res.status(400).json({
      error: 'Invalid tracking ID format. Expected ST-{user}-{code} (e.g. ST-7-K9F3A2)',
    });
  }

  let geo = null;
  try {
    geo = await resolveShipmentRoute(origin_location, destination_location);
  } catch (err) {
    return res.status(400).json({
      error: `Could not resolve map locations: ${err.message}`,
    });
  }

  const client = await pool.connect();
  const storedSenderPhone = sender_phone?.trim() || null;

  try {
    await client.query('BEGIN');

    const shipmentResult = await client.query(
      `INSERT INTO shipments (
        tracking_number, origin_location, destination_location,
        sender_id, driver_id, status, weight, dimensions, contents,
        sender_name, recipient_name, sender_phone, recipient_phone, expected_delivery,
        origin_latitude, origin_longitude, destination_latitude, destination_longitude,
        planned_route
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id`,
      [
        trackingNumber,
        origin_location,
        destination_location,
        senderId,
        driver_id || null,
        status,
        weight ?? null,
        dimensions || null,
        contents || null,
        sender_name?.trim() || null,
        recipient_name?.trim() || null,
        storedSenderPhone,
        recipient_phone?.trim() || null,
        expected_delivery || null,
        geo.origin_latitude,
        geo.origin_longitude,
        geo.destination_latitude,
        geo.destination_longitude,
        JSON.stringify(geo.planned_route),
      ]
    );

    const shipmentId = shipmentResult.rows[0].id;

    const startLat = latitude != null ? parseFloat(latitude) : geo.origin_latitude;
    const startLng = longitude != null ? parseFloat(longitude) : geo.origin_longitude;

    await client.query(
      `INSERT INTO gps_locations (shipment_id, latitude, longitude, recorded_at)
       VALUES ($1, $2, $3, NOW())`,
      [shipmentId, startLat, startLng]
    );

    await client.query('COMMIT');

    const result = await pool.query(
      `${shipmentSelect} WHERE s.id = $1`,
      [shipmentId]
    );

    const shipment = formatShipment(result.rows[0]);
    const frontendBase = process.env.CORS_ORIGIN || 'http://localhost:3000';
    const links = buildTrackingLinks(shipment.tracking_number, frontendBase);

    const sms = await sendShipmentSmsToParties(shipment, links.webUrl);

    res.status(201).json({ ...shipment, ...links, sms });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Tracking number already exists' });
    }
    throw err;
  } finally {
    client.release();
  }
});

router.get('/', async (req, res) => {
  const result = await pool.query(
    `${shipmentSelect} ORDER BY s.created_at DESC`
  );
  res.json(result.rows.map(formatShipment));
});

router.get('/tracking-id', auth, async (req, res) => {
  const trackingNumber = await generateUniqueTrackingId(pool, req.user.id);
  const frontendBase = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const links = buildTrackingLinks(trackingNumber, frontendBase);

  res.json({
    trackingNumber,
    userId: req.user.id,
    ...links,
  });
});

router.get('/track/:trackingNumber', async (req, res) => {
  const normalized = normalizeTrackingNumber(req.params.trackingNumber);
  const result = await pool.query(
    `${shipmentSelect} WHERE UPPER(s.tracking_number) = UPPER($1)`,
    [normalized]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  res.json(formatShipment(result.rows[0]));
});

router.post('/:id/send-sms', auth, async (req, res) => {
  const result = await pool.query(
    `${shipmentSelect} WHERE s.id = $1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const shipment = formatShipment(result.rows[0]);
  const frontendBase = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const links = buildTrackingLinks(shipment.tracking_number, frontendBase);
  const sms = await sendShipmentSmsToParties(shipment, links.webUrl);

  res.json({ sms, webUrl: links.webUrl });
});

router.get('/:id/history', async (req, res) => {
  const shipment = await pool.query('SELECT id FROM shipments WHERE id = $1', [req.params.id]);
  if (shipment.rows.length === 0) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const history = await getLocationHistory(req.params.id);
  res.json(history);
});

router.post('/:id/location', auth, async (req, res) => {
  const { latitude, longitude, altitude, accuracy, speed } = req.body;

  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const shipment = await pool.query('SELECT id FROM shipments WHERE id = $1', [req.params.id]);
  if (shipment.rows.length === 0) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const location = await saveLocation(req.params.id, {
    latitude, longitude, altitude, accuracy, speed,
  });

  const payload = {
    shipmentId: parseInt(req.params.id, 10),
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    speed: location.speed,
    recordedAt: location.recordedAt,
  };

  const io = req.app.get('io');
  if (io) {
    io.emit('location-change', payload);
  }

  res.status(201).json(payload);
});

router.get('/:id/sensors', async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM sensor_data
     WHERE shipment_id = $1
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'No sensor data found' });
  }

  const row = result.rows[0];
  res.json({
    shipmentId: row.shipment_id,
    temperature: row.temperature != null ? parseFloat(row.temperature) : null,
    humidity: row.humidity != null ? parseFloat(row.humidity) : null,
    pressure: row.pressure != null ? parseFloat(row.pressure) : null,
    sensorId: row.sensor_id,
    recordedAt: row.recorded_at,
  });
});

router.get('/:id', async (req, res) => {
  const result = await pool.query(
    `${shipmentSelect} WHERE s.id = $1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  res.json(formatShipment(result.rows[0]));
});

module.exports = router;
