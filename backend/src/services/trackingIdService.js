const crypto = require('crypto');

/** Excludes ambiguous characters (0/O, 1/I) for easier mobile entry */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const TRACKING_ID_PATTERN = /^ST-[A-Z0-9]+-[A-Z0-9]{6}$/;

function userCode(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Invalid user id for tracking ID');
  }
  return id.toString(36).toUpperCase();
}

function randomSegment(length = 6) {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return result;
}

/**
 * Format: ST-{userCode}-{6 random chars}
 * Example: ST-7-K9F3A2 (user 7), ST-1F-X2M9P4 (user 47)
 * Unique per shipment; userCode ties the ID to the creating user.
 */
function generateTrackingId(userId) {
  return `ST-${userCode(userId)}-${randomSegment(6)}`;
}

function isValidTrackingId(value) {
  if (!value || typeof value !== 'string') return false;
  return TRACKING_ID_PATTERN.test(value.trim().toUpperCase());
}

function parseUserIdFromTrackingId(trackingNumber) {
  if (!isValidTrackingId(trackingNumber)) return null;
  const parts = trackingNumber.trim().toUpperCase().split('-');
  const parsed = parseInt(parts[1], 36);
  return Number.isNaN(parsed) ? null : parsed;
}

async function isTrackingIdAvailable(pool, trackingNumber) {
  const result = await pool.query(
    'SELECT 1 FROM shipments WHERE UPPER(tracking_number) = UPPER($1) LIMIT 1',
    [trackingNumber.trim()]
  );
  return result.rows.length === 0;
}

async function generateUniqueTrackingId(pool, userId, maxAttempts = 12) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const trackingNumber = generateTrackingId(userId);
    if (await isTrackingIdAvailable(pool, trackingNumber)) {
      return trackingNumber;
    }
  }
  throw new Error('Could not generate a unique tracking ID');
}

function buildTrackingLinks(trackingNumber, baseUrl) {
  const normalized = normalizeTrackingNumber(trackingNumber);
  const encoded = encodeURIComponent(normalized);
  const webBase = (baseUrl || '').replace(/\/$/, '');
  return {
    trackingNumber: normalized,
    webPath: `/track/${encoded}`,
    webUrl: webBase ? `${webBase}/track/${encoded}` : `/track/${encoded}`,
    mobilePath: `/track/${encoded}`,
  };
}

function normalizeTrackingNumber(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}

module.exports = {
  TRACKING_ID_PATTERN,
  generateTrackingId,
  generateUniqueTrackingId,
  isValidTrackingId,
  isTrackingIdAvailable,
  parseUserIdFromTrackingId,
  buildTrackingLinks,
  normalizeTrackingNumber,
};
