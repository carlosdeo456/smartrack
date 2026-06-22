import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { SOCKET_EVENTS } from '../utils/constants';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

/**
 * Subscribes to real-time shipment location, sensor, and alert events via Socket.io.
 * Pass callbacks for side effects (e.g. updating a shipments list on the dashboard).
 */
export function useLiveTracking({
  onLocationChange,
  onSensorUpdate,
  onAlert,
  onConnect,
  onDisconnect,
  onError
} = {}) {
  const [liveLocation, setLiveLocation] = useState(null);
  const [connected, setConnected] = useState(false);
  const callbacksRef = useRef({
    onLocationChange,
    onSensorUpdate,
    onAlert,
    onConnect,
    onDisconnect,
    onError
  });

  callbacksRef.current = {
    onLocationChange,
    onSensorUpdate,
    onAlert,
    onConnect,
    onDisconnect,
    onError
  };

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on(SOCKET_EVENTS.CONNECT, () => {
      setConnected(true);
      callbacksRef.current.onConnect?.();
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      setConnected(false);
      callbacksRef.current.onDisconnect?.();
    });

    socket.on(SOCKET_EVENTS.LOCATION_CHANGE, (data) => {
      setLiveLocation(data);
      callbacksRef.current.onLocationChange?.(data);
    });

    socket.on(SOCKET_EVENTS.SENSOR_UPDATE, (data) => {
      callbacksRef.current.onSensorUpdate?.(data);
    });

    socket.on(SOCKET_EVENTS.ALERT_TRIGGERED, (alert) => {
      callbacksRef.current.onAlert?.(alert);
    });

    socket.on('connect_error', (error) => {
      callbacksRef.current.onError?.(error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { liveLocation, connected };
}

export default useLiveTracking;
