/** Normalize tracking IDs for search and URLs (case-insensitive). */
export function normalizeTrackingNumber(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}
