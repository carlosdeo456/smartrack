function readRuntimeConfig() {
  if (typeof window !== 'undefined' && window.__SMARTRACK__) {
    return window.__SMARTRACK__;
  }
  return {};
}

function normalizeBaseUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '').replace(/\/api$/i, '');
}

const runtime = readRuntimeConfig();

export const API_URL =
  normalizeBaseUrl(runtime.API_URL) ||
  normalizeBaseUrl(process.env.REACT_APP_API_URL) ||
  'http://localhost:5000';

export const SOCKET_URL =
  normalizeBaseUrl(runtime.SOCKET_URL) ||
  normalizeBaseUrl(process.env.REACT_APP_SOCKET_URL) ||
  API_URL;

export function getApiErrorMessage(data, fallback = 'Request failed') {
  if (!data) return fallback;
  if (typeof data.error === 'string') return data.error;
  if (data.error?.message) return data.error.message;
  if (typeof data.message === 'string') return data.message;
  return fallback;
}
