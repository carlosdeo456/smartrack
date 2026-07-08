import { API_URL, getApiErrorMessage } from '../utils/apiConfig';

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

    throw new Error(getApiErrorMessage(data, `Request failed (${response.status})`));
  }

  if (response.status === 204) return null;
  return response.json();
}
