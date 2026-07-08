const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const shipmentChatAuth = require('../middleware/shipmentChatAuth');
const { saveLocation, getLocationHistory } = require('../services/gpsService');
const { resolveShipmentRoute } = require('../services/geocodingService');
const {
  notifyShipmentConversationMessage,
  notifyShipmentCreated,
  notifyShipmentMilestone,
} = require('../services/shipmentNotificationService');
const {
  generateUniqueTrackingId,
  isValidTrackingId,
  buildTrackingLinks,
  normalizeTrackingNumber,
} = require('../services/trackingIdService');
const {
  normalizeDeviceId,
  assignDeviceToShipment,
} = require('../services/iotDeviceAssignmentService');
const {
  normalizeParticipantRole,
  getParticipantName,
  verifyParticipantPhone,
  issueShipmentChatToken,
  listShipmentMessages,
  markMessagesAsRead,
  createShipmentMessage,
} = require('../services/shipmentChatService');

const router = express.Router();

const shipmentSelect = `
  SELECT
    s.*,
    sender.full_name AS sender_account_name,
    sender.phone AS account_sender_phone,
    sender.email AS sender_email,
    d.full_name AS driver_name,
    d.phone AS driver_phone,
    ida.device_id AS assigned_device_id,
    gl.latitude AS latest_latitude,
    gl.longitude AS latest_longitude,
    gl.recorded_at AS latest_location_at,
    gl.accuracy AS latest_accuracy,
    gl.speed AS latest_speed,
    gl.source AS latest_source
  FROM shipments s
  LEFT JOIN users sender ON sender.id = s.sender_id
  LEFT JOIN users d ON d.id = s.driver_id
  LEFT JOIN LATERAL (
    SELECT device_id
    FROM iot_device_assignments
    WHERE shipment_id = s.id AND unassigned_at IS NULL
    ORDER BY assigned_at DESC
    LIMIT 1
  ) ida ON true
  LEFT JOIN LATERAL (
    SELECT latitude, longitude, recorded_at, accuracy, speed, source
    FROM gps_locations
    WHERE shipment_id = s.id
      AND (
        ida.device_id IS NULL
        OR COALESCE(source, 'tracker') <> 'hub'
      )
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
    const fromTracker = row.latest_source === 'tracker'
      || (row.latest_source == null && Boolean(row.assigned_device_id));
    shipment.currentLocation = {
      shipmentId: row.id,
      latitude: parseFloat(row.latest_latitude),
      longitude: parseFloat(row.latest_longitude),
      recordedAt: row.latest_location_at,
      accuracy: row.latest_accuracy != null ? parseFloat(row.latest_accuracy) : null,
      speed: row.latest_speed != null ? parseFloat(row.latest_speed) : null,
      fromTracker,
    };
  }

  delete shipment.latest_latitude;
  delete shipment.latest_longitude;
  delete shipment.latest_location_at;
  delete shipment.latest_accuracy;
  delete shipment.latest_speed;
  delete shipment.latest_source;

  if (shipment.tracking_number) {
    shipment.tracking_number = normalizeTrackingNumber(shipment.tracking_number);
  }

  shipment.assignedDeviceId = row.assigned_device_id || null;
  delete shipment.assigned_device_id;

  return shipment;
}

async function getShipmentByTrackingNumber(trackingNumber) {
  const normalized = normalizeTrackingNumber(trackingNumber);
  const result = await pool.query(
    `${shipmentSelect} WHERE UPPER(s.tracking_number) = UPPER($1)`,
    [normalized]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return formatShipment(result.rows[0]);
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
    carrier_name,
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

  const validStatuses = ['pending', 'dispatched', 'in_transit', 'out_for_delivery', 'delayed', 'delivered', 'failed'];
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
        sender_id, driver_id, status, weight, dimensions, contents, carrier_name,
        sender_name, recipient_name, sender_phone, recipient_phone, expected_delivery,
        origin_latitude, origin_longitude, destination_latitude, destination_longitude,
        planned_route
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
        carrier_name?.trim() || null,
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
      `INSERT INTO gps_locations (shipment_id, latitude, longitude, source, recorded_at)
       VALUES ($1, $2, $3, 'hub', NOW())`,
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

    let notifications;
    try {
      notifications = await notifyShipmentCreated({
        shipment,
        trackUrl: links.webUrl,
      });
    } catch (err) {
      notifications = {
        sent: [],
        failed: [{
          role: 'system',
          phone: null,
          error: err.message,
        }],
        simulated: false,
      };
    }

    res.status(201).json({ ...shipment, ...links, notifications, sms: notifications });
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

router.delete('/all', auth, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const countResult = await client.query('SELECT COUNT(*)::int AS count FROM shipments');
    const total = countResult.rows[0]?.count || 0;

    await client.query('DELETE FROM shipments');

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        deletedShipments: total,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

router.post('/track/:trackingNumber/chat/access', async (req, res) => {
  const role = normalizeParticipantRole(req.body.role);
  const phone = req.body.phone;

  if (!role || !['sender', 'receiver'].includes(role)) {
    return res.status(400).json({ error: 'role must be sender or receiver' });
  }

  if (!phone) {
    return res.status(400).json({ error: 'phone is required' });
  }

  const shipment = await getShipmentByTrackingNumber(req.params.trackingNumber);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  if (!verifyParticipantPhone(shipment, role, phone)) {
    return res.status(403).json({ error: 'Phone number does not match this shipment participant' });
  }

  const token = issueShipmentChatToken({
    shipmentId: shipment.id,
    trackingNumber: shipment.tracking_number,
    role,
    phone,
  });

  res.json({
    success: true,
    data: {
      shipmentId: shipment.id,
      trackingNumber: shipment.tracking_number,
      role,
      displayName: getParticipantName(shipment, role),
      accessToken: token,
    },
  });
});

router.get('/track/:trackingNumber/messages', shipmentChatAuth, async (req, res) => {
  const shipment = await getShipmentByTrackingNumber(req.params.trackingNumber);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  if (shipment.id !== req.shipmentChat.shipmentId || shipment.tracking_number !== req.shipmentChat.trackingNumber) {
    return res.status(403).json({ error: 'Shipment chat token does not match this shipment' });
  }

  await markMessagesAsRead(pool, shipment.id, req.shipmentChat.role);
  const messages = await listShipmentMessages(pool, shipment.id);

  res.json({
    success: true,
    data: {
      shipmentId: shipment.id,
      trackingNumber: shipment.tracking_number,
      role: req.shipmentChat.role,
      messages,
    },
  });
});

router.post('/track/:trackingNumber/messages', shipmentChatAuth, async (req, res) => {
  const shipment = await getShipmentByTrackingNumber(req.params.trackingNumber);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  if (shipment.id !== req.shipmentChat.shipmentId || shipment.tracking_number !== req.shipmentChat.trackingNumber) {
    return res.status(403).json({ error: 'Shipment chat token does not match this shipment' });
  }

  const messageText = String(req.body.message || '').trim();
  if (!messageText) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (messageText.length > 1000) {
    return res.status(400).json({ error: 'message must be 1000 characters or less' });
  }

  const message = await createShipmentMessage(pool, {
    shipmentId: shipment.id,
    senderRole: req.shipmentChat.role,
    senderName: getParticipantName(shipment, req.shipmentChat.role),
    messageBody: messageText,
  });

  const frontendBase = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const links = buildTrackingLinks(shipment.tracking_number, frontendBase);
  const notifications = await notifyShipmentConversationMessage({
    shipment,
    senderRole: req.shipmentChat.role,
    messageBody: messageText,
    trackUrl: links.webUrl,
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`shipment-chat:${shipment.id}`).emit('shipment-message', {
      shipmentId: shipment.id,
      trackingNumber: shipment.tracking_number,
      message,
    });
  }

  res.status(201).json({
    success: true,
    data: {
      shipmentId: shipment.id,
      trackingNumber: shipment.tracking_number,
      message,
      notifications,
    },
  });
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
  let notifications;

  try {
    notifications = await notifyShipmentCreated({
      shipment,
      trackUrl: links.webUrl,
    });
  } catch (err) {
    notifications = {
      sent: [],
      failed: [{
        role: 'system',
        phone: null,
        error: err.message,
      }],
      simulated: false,
    };
  }

  res.json({ notifications, sms: notifications, webUrl: links.webUrl });
});

router.patch('/:id/status', auth, async (req, res) => {
  const shipmentId = parseInt(req.params.id, 10);
  const {
    status,
    expected_delivery,
    carrier_name,
  } = req.body;

  if (Number.isNaN(shipmentId) || shipmentId <= 0) {
    return res.status(400).json({ error: 'Invalid shipment id' });
  }

  const validStatuses = ['pending', 'dispatched', 'in_transit', 'out_for_delivery', 'delayed', 'delivered', 'failed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const client = await pool.connect();
  let previousStatus = null;

  try {
    await client.query('BEGIN');

    const existingResult = await client.query(
      'SELECT id, status, expected_delivery, carrier_name FROM shipments WHERE id = $1 FOR UPDATE',
      [shipmentId]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const existing = existingResult.rows[0];
    previousStatus = existing.status;
    const nextExpectedDelivery = Object.prototype.hasOwnProperty.call(req.body, 'expected_delivery')
      ? expected_delivery || null
      : existing.expected_delivery;
    const nextCarrierName = Object.prototype.hasOwnProperty.call(req.body, 'carrier_name')
      ? carrier_name?.trim() || null
      : existing.carrier_name;

    await client.query(
      `UPDATE shipments
       SET status = $1,
           expected_delivery = $2,
           carrier_name = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [status, nextExpectedDelivery, nextCarrierName, shipmentId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const updatedResult = await pool.query(
    `${shipmentSelect} WHERE s.id = $1`,
    [shipmentId]
  );

  const shipment = formatShipment(updatedResult.rows[0]);
  const frontendBase = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const links = buildTrackingLinks(shipment.tracking_number, frontendBase);

  let notifications;
  try {
    notifications = await notifyShipmentMilestone({
      shipment,
      previousStatus,
      nextStatus: shipment.status,
      trackUrl: links.webUrl,
      channel: 'sms',
    });
  } catch (err) {
    notifications = {
      sent: [],
      failed: [{
        role: 'system',
        phone: null,
        error: err.message,
      }],
      simulated: false,
    };
  }

  res.json({
    success: true,
    data: {
      shipment: {
        ...shipment,
        ...links,
      },
      previousStatus,
      notifications,
    },
  });
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

router.post('/:id/assign-device', auth, async (req, res) => {
  const shipmentId = parseInt(req.params.id, 10);
  const deviceId = normalizeDeviceId(req.body.deviceId || req.body.device_id);

  if (Number.isNaN(shipmentId) || shipmentId <= 0) {
    return res.status(400).json({ error: 'Invalid shipment id' });
  }

  if (!deviceId) {
    return res.status(400).json({ error: 'device_id is required' });
  }

  const shipment = await pool.query('SELECT tracking_number FROM shipments WHERE id = $1', [shipmentId]);
  if (shipment.rows.length === 0) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const assignment = await assignDeviceToShipment(client, { shipmentId, deviceId });
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        shipmentId,
        trackingNumber: shipment.rows[0].tracking_number,
        deviceId: assignment.device_id,
        assignedAt: assignment.assigned_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.get('/:id/device-assignment', auth, async (req, res) => {
  const shipmentId = parseInt(req.params.id, 10);

  if (Number.isNaN(shipmentId) || shipmentId <= 0) {
    return res.status(400).json({ error: 'Invalid shipment id' });
  }

  const shipment = await pool.query('SELECT tracking_number FROM shipments WHERE id = $1', [shipmentId]);
  if (shipment.rows.length === 0) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const result = await pool.query(
    `SELECT device_id, assigned_at
     FROM iot_device_assignments
     WHERE shipment_id = $1 AND unassigned_at IS NULL
     ORDER BY assigned_at DESC
     LIMIT 1`,
    [shipmentId]
  );

  res.json({
    success: true,
    data: {
      shipmentId,
      trackingNumber: shipment.rows[0].tracking_number,
      deviceId: result.rows[0]?.device_id || null,
      assignedAt: result.rows[0]?.assigned_at || null,
    },
  });
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
