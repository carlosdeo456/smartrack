const ApiError = require('../utils/ApiError');

function normalizeDeviceId(value) {
  if (value == null) return '';
  return String(value).trim();
}

async function findActiveAssignmentByDeviceId(db, deviceId) {
  const normalized = normalizeDeviceId(deviceId);
  if (!normalized) return null;

  const result = await db.query(
    `SELECT ida.id, ida.device_id, ida.shipment_id, ida.assigned_at, s.tracking_number
     FROM iot_device_assignments ida
     JOIN shipments s ON s.id = ida.shipment_id
     WHERE LOWER(ida.device_id) = LOWER($1) AND ida.unassigned_at IS NULL
     ORDER BY ida.assigned_at DESC
     LIMIT 1`,
    [normalized]
  );

  return result.rows[0] || null;
}

async function assignDeviceToShipment(db, { shipmentId, deviceId }) {
  const normalized = normalizeDeviceId(deviceId);
  if (!normalized) {
    throw new ApiError(400, 'device_id is required');
  }

  await db.query(
    `UPDATE iot_device_assignments
     SET unassigned_at = NOW()
     WHERE (LOWER(device_id) = LOWER($1) OR shipment_id = $2) AND unassigned_at IS NULL`,
    [normalized, shipmentId]
  );

  const result = await db.query(
    `INSERT INTO iot_device_assignments (device_id, shipment_id, assigned_at)
     VALUES ($1, $2, NOW())
     RETURNING id, device_id, shipment_id, assigned_at`,
    [normalized, shipmentId]
  );

  return result.rows[0];
}

module.exports = {
  normalizeDeviceId,
  findActiveAssignmentByDeviceId,
  assignDeviceToShipment,
};
