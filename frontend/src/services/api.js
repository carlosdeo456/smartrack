const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'smartrack_token';
const USER_KEY = 'smartrack_user';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('smartrack_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      throw new Error('Your session expired. Please sign in again.');
    }

    const message = typeof data.error === 'string'
      ? data.error
      : data.error?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}
