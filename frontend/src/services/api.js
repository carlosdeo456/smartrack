const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;
  return response.json();
}
