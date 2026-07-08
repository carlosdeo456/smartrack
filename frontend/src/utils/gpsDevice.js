import { apiFetch } from '../services/api';

export function normalizeDeviceId(value) {
  return String(value || '').trim();
}

export async function assignGpsDevice({ deviceId, trackingNumber, shipmentId }) {
  const normalized = normalizeDeviceId(deviceId);
  if (!normalized) {
    throw new Error('GPS device ID is required');
  }

  const body = trackingNumber
    ? { tracking_number: trackingNumber }
  : shipmentId
    ? { shipment_id: shipmentId }
    : null;

  if (!body) {
    throw new Error('tracking_number or shipmentId is required');
  }

  return apiFetch(`/api/iot/devices/${encodeURIComponent(normalized)}/assign`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchDeviceAssignment(shipmentId) {
  return apiFetch(`/api/shipments/${shipmentId}/device-assignment`);
}
