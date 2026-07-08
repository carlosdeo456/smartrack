import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';
import { SOCKET_EVENTS } from '../../utils/constants';

import { API_URL, SOCKET_URL } from '../../utils/apiConfig';

function storageKey(trackingNumber) {
  return `smartrack-chat:${trackingNumber}`;
}

function timeLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

function mergeMessages(current, incoming) {
  const map = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => {
    map.set(message.id, message);
  });
  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

const ShipmentChatPanel = ({ shipment }) => {
  const [role, setRole] = useState('receiver');
  const [phone, setPhone] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  const storage = useMemo(() => storageKey(shipment.tracking_number), [shipment.tracking_number]);

  const clearSession = () => {
    setAccessToken('');
    setDisplayName('');
    setMessages([]);
    sessionStorage.removeItem(storage);
  };

  const fetchMessages = async (token) => {
    setLoadingMessages(true);
    setError('');
    try {
      const response = await fetch(
        `${API_URL}/api/shipments/track/${encodeURIComponent(shipment.tracking_number)}/messages`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Could not load shipment messages');
      }

      setMessages(payload.data?.messages || []);
    } catch (err) {
      clearSession();
      setError(err.message || 'Could not load shipment messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem(storage);
    if (!saved) {
      setRole('receiver');
      setPhone('');
      clearSession();
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      setRole(parsed.role || 'receiver');
      setPhone(parsed.phone || '');
      setAccessToken(parsed.accessToken || '');
      setDisplayName(parsed.displayName || '');
      if (parsed.accessToken) {
        fetchMessages(parsed.accessToken);
      }
    } catch {
      sessionStorage.removeItem(storage);
    }
  }, [storage, shipment.tracking_number]);

  useEffect(() => {
    if (!accessToken || !shipment?.id) return undefined;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on(SOCKET_EVENTS.CONNECT, () => {
      socket.emit('join-shipment-chat', { token: accessToken });
    });

    socket.on(SOCKET_EVENTS.SHIPMENT_MESSAGE, (payload) => {
      if (payload?.shipmentId !== shipment.id || !payload.message) return;
      setMessages((current) => mergeMessages(current, [payload.message]));
    });

    socket.on('shipment-chat-error', (payload) => {
      setError(payload?.error || 'Chat connection failed');
    });

    return () => {
      socket.emit('leave-shipment-chat', { shipmentId: shipment.id });
      socket.disconnect();
    };
  }, [accessToken, shipment?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAccess = async (event) => {
    event.preventDefault();
    setLoadingAccess(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(
        `${API_URL}/api/shipments/track/${encodeURIComponent(shipment.tracking_number)}/chat/access`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role, phone }),
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Could not verify chat access');
      }

      const token = payload.data?.accessToken || '';
      const nextDisplayName = payload.data?.displayName || '';

      setAccessToken(token);
      setDisplayName(nextDisplayName);
      sessionStorage.setItem(storage, JSON.stringify({
        role,
        phone,
        accessToken: token,
        displayName: nextDisplayName,
      }));
      await fetchMessages(token);
      setNotice('Chat unlocked. New messages will notify the other participant.');
    } catch (err) {
      setError(err.message || 'Could not verify chat access');
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !accessToken) return;

    setSending(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/api/shipments/track/${encodeURIComponent(shipment.tracking_number)}/messages`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ message: draft.trim() }),
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Could not send message');
      }

      if (payload.data?.message) {
        setMessages((current) => mergeMessages(current, [payload.data.message]));
      }
      setDraft('');
      setNotice('Message sent. The other participant has been notified.');
    } catch (err) {
      setError(err.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">Parcel messages</h3>
          <p className="text-sm text-gray-500">
            Sender and receiver can exchange parcel updates here without exposing a full SMS thread.
          </p>
        </div>
        {accessToken && (
          <button
            type="button"
            className="text-xs font-semibold text-gray-500 hover:text-gray-700"
            onClick={clearSession}
          >
            Switch participant
          </button>
        )}
      </div>

      {!accessToken ? (
        <form onSubmit={handleAccess} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              I am
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="sender">Sender</option>
                <option value="receiver">Receiver</option>
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Phone number
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+2557..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={loadingAccess || !phone.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAccess ? 'Checking…' : 'Open chat'}
          </button>
        </form>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span>
              Chatting as <strong>{displayName}</strong> ({role})
            </span>
            <span>{loadingMessages ? 'Refreshing…' : `${messages.length} messages`}</span>
          </div>

          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500">
                No parcel messages yet. Start the conversation with delivery instructions or questions.
              </p>
            ) : (
              messages.map((message) => {
                const mine = message.senderRole === role;
                return (
                  <div
                    key={message.id}
                    className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      mine ? 'bg-emerald-600 text-white' : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                    >
                      <div className={`mb-1 text-xs font-semibold ${mine ? 'text-emerald-100' : 'text-gray-500'}`}>
                        {message.senderName}
                      </div>
                      <p className="whitespace-pre-wrap break-words">{message.message}</p>
                      <div className={`mt-2 text-[11px] ${mine ? 'text-emerald-100' : 'text-gray-400'}`}>
                        {timeLabel(message.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="mt-4 space-y-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Type your parcel message here…"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Sending a message also notifies the other participant by phone.
              </p>
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        </>
      )}

      {notice && <p className="mt-3 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
};

ShipmentChatPanel.propTypes = {
  shipment: PropTypes.object.isRequired,
};

export default ShipmentChatPanel;
