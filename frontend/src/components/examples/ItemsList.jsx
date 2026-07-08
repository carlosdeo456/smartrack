import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Decoupled API demo — fetches items from centralized backend.
 *
 * Set REACT_APP_API_URL in frontend/.env to your backend LAN IP:
 *   REACT_APP_API_URL=http://192.168.1.10:5000
 */
import { API_URL as API_BASE } from '../../utils/apiConfig';
const ITEMS_URL = `${API_BASE}/api/v1/items`;

const ItemsList = ({ apiBaseUrl }) => {
  const base = apiBaseUrl || API_BASE;
  const itemsUrl = `${base.replace(/\/$/, '')}/api/v1/items`;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(itemsUrl);
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || `Request failed (${response.status})`);
      }

      setItems(json.data || []);
    } catch (err) {
      setError(err.message || 'Could not load items. Check API URL and Wi-Fi.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [itemsUrl]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(itemsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), status: 'active' }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Create failed');
      }

      setTitle('');
      await fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setError(null);
    try {
      const response = await fetch(`${itemsUrl}/${id}`, { method: 'DELETE' });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Delete failed');
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">API v1 Items</h1>
        <p className="text-sm text-gray-500 mt-1">
          Backend: <code className="text-emerald-700">{itemsUrl}</code>
        </p>
      </header>

      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New item title"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </form>

      {loading && (
        <div className="text-center py-12 text-gray-500">Loading items…</div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-gray-500 text-center py-8">No items yet. Create one above.</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm"
            >
              <div>
                <p className="font-semibold text-gray-900">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  #{item.id} · {item.status} · {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="text-sm text-red-600 hover:text-red-800 font-medium shrink-0"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

ItemsList.propTypes = {
  apiBaseUrl: PropTypes.string,
};

export default ItemsList;
