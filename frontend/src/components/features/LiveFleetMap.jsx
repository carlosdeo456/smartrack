import React, { useEffect, useMemo, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Spinner } from '../ui';

import { TZ_DEFAULT_CENTER } from '../../utils/tanzaniaRegions';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const MAP_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const MINT = '#34D399';

function createCourierIcon(isLive) {
  return L.divIcon({
    className: 'bolt-driver-icon',
    html: `
      <div class="bolt-vehicle-wrap">
        ${isLive ? '<div class="bolt-vehicle-pulse"></div>' : ''}
        <div class="bolt-driver-inner bolt-courier-inner">
          <span class="bolt-driver-emoji" aria-hidden="true">🛵</span>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
}

function FitAllMarkers({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 11 });
  }, [points, map]);

  return null;
}

const LiveFleetMap = ({ shipments = [], liveLocation, connected = false, isLoading = false, compact = false }) => {
  const [trails, setTrails] = useState({});
  const loadedRef = useRef(new Set());

  const activeShipments = useMemo(
    () => shipments.filter(
      s => s.status === 'in_transit'
        && s.currentLocation?.latitude != null
        && s.currentLocation?.longitude != null
    ),
    [shipments]
  );

  useEffect(() => {
    activeShipments.forEach(async (shipment) => {
      if (loadedRef.current.has(shipment.id)) return;
      loadedRef.current.add(shipment.id);
      try {
        const res = await fetch(`${API_URL}/api/shipments/${shipment.id}/history`);
        if (res.ok) {
          const history = await res.json();
          setTrails(prev => ({ ...prev, [shipment.id]: history }));
        }
      } catch {
        loadedRef.current.delete(shipment.id);
      }
    });
  }, [activeShipments]);

  useEffect(() => {
    if (!liveLocation?.shipmentId) return;

    setTrails(prev => {
      const existing = prev[liveLocation.shipmentId] || [];
      const last = existing[existing.length - 1];
      if (last?.latitude === liveLocation.latitude && last?.longitude === liveLocation.longitude) {
        return prev;
      }
      return {
        ...prev,
        [liveLocation.shipmentId]: [
          ...existing,
          {
            latitude: liveLocation.latitude,
            longitude: liveLocation.longitude,
            recordedAt: liveLocation.recordedAt
          }
        ]
      };
    });
  }, [liveLocation]);

  const markerPoints = useMemo(
    () => activeShipments.map(s => ({
      lat: s.currentLocation.latitude,
      lng: s.currentLocation.longitude
    })),
    [activeShipments]
  );

  const defaultCenter = markerPoints[0] || TZ_DEFAULT_CENTER;

  const heightClass = compact ? 'h-[220px] min-h-[220px]' : 'h-[calc(100vh-12rem)] min-h-[32rem]';
  const shellBg = compact ? 'bg-[#0d0f16]' : 'bg-gray-100';
  const shellRound = compact ? '' : 'rounded-xl';

  if (isLoading) {
    return (
      <div className={`${heightClass} flex items-center justify-center ${shellBg} ${shellRound}`}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (activeShipments.length === 0) {
    return (
      <div className={`${heightClass} flex items-center justify-center ${shellBg} ${shellRound} p-8 text-center`}>
        <div>
          <p className="text-4xl mb-3">📍</p>
          <p className={`text-lg font-bold ${compact ? 'text-gray-200' : 'text-gray-900'}`}>No parcels on the map yet</p>
          <p className={`text-sm mt-2 ${compact ? 'text-gray-500' : 'text-gray-600'}`}>
            In-transit shipments with live GPS will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${heightClass} ${compact ? '' : 'rounded-xl shadow-lg border border-gray-200'} overflow-hidden`}>
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={markerPoints.length > 1 ? 7 : 13}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILES} />
        <FitAllMarkers points={markerPoints} />

        {activeShipments.map((shipment) => {
          const trail = trails[shipment.id] || [];
          const positions = trail.map(p => [p.latitude, p.longitude]);
          const isLive = shipment.status === 'in_transit';
          const loc = shipment.currentLocation;

          return (
            <React.Fragment key={shipment.id}>
              {positions.length > 1 && (
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color: isLive ? MINT : '#94a3b8',
                    weight: 5,
                    opacity: isLive ? 1 : 0.7,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
              )}
              <Marker
                position={[loc.latitude, loc.longitude]}
                icon={createCourierIcon(isLive && connected)}
              >
                <Popup>
                  <div className="text-sm min-w-[10rem]">
                    <p className="font-bold">{shipment.tracking_number}</p>
                    <p className="text-gray-600 capitalize">{shipment.status?.replace('_', ' ')}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {shipment.origin_location} → {shipment.destination_location}
                    </p>
                    {isLive && connected && (
                      <p className="text-xs font-bold text-emerald-600 mt-2">● Live on route</p>
                    )}
                    <Link
                      to={`/track/${encodeURIComponent(shipment.tracking_number)}`}
                      className="inline-block mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      Open live view →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

LiveFleetMap.propTypes = {
  shipments: PropTypes.array,
  liveLocation: PropTypes.object,
  connected: PropTypes.bool,
  isLoading: PropTypes.bool,
  compact: PropTypes.bool
};

export default LiveFleetMap;
