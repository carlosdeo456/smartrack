import React, { useEffect, useMemo, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Spinner } from '../ui';

import { TZ_DEFAULT_CENTER } from '../../utils/tanzaniaRegions';
import AnimatedVehicleMarker from '../map/AnimatedVehicleMarker';
import { getBearing } from '../map/vehicleMarker';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const MAP_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const MINT = '#34D399';
const MINT_DARK = '#10B981';
const SLATE = '#94A3B8';

function pointKey(points) {
  return points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
}

function isDefaultCenter(point) {
  return (
    Math.abs(point.lat - TZ_DEFAULT_CENTER.lat) < 0.001 &&
    Math.abs(point.lng - TZ_DEFAULT_CENTER.lng) < 0.001
  );
}

function FitAllMarkers({ points }) {
  const map = useMap();
  const lastKeyRef = useRef('');

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1 && isDefaultCenter(points[0])) return;

    const key = pointKey(points);
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    map.invalidateSize();
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 11 });
  }, [points, map]);

  return null;
}

function MapResizeObserver() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const onResize = () => map.invalidateSize();
    const observer = new ResizeObserver(onResize);
    observer.observe(container);
    onResize();
    return () => observer.disconnect();
  }, [map]);

  return null;
}

function timeAgo(dateStr) {
  if (!dateStr) return 'just now';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function ShipmentMarker({ shipment, trail, connected }) {
  const isLive = shipment.status === 'in_transit';
  const loc = shipment.currentLocation;
  const routeColor = isLive ? MINT : SLATE;
  const positions = trail.map(p => [p.latitude, p.longitude]);
  const previousPoint = trail.length > 1 ? trail[trail.length - 2] : null;
  const bearing = getBearing(
    previousPoint ? { lat: previousPoint.latitude, lng: previousPoint.longitude } : null,
    loc?.latitude != null && loc?.longitude != null ? { lat: loc.latitude, lng: loc.longitude } : null
  );
  const isLiveVehicle = isLive;

  const popupHtml = `
    <div class="text-sm min-w-[12rem]">
      <p class="font-bold">${shipment.tracking_number}</p>
      <p class="text-gray-600 capitalize">${shipment.status?.replace('_', ' ') || ''}</p>
      <p class="text-gray-500 text-xs mt-1">${shipment.origin_location} → ${shipment.destination_location}</p>
      ${loc?.latitude != null ? `<p class="text-xs font-mono text-gray-600 mt-2">${Number(loc.latitude).toFixed(5)}, ${Number(loc.longitude).toFixed(5)}</p>` : ''}
      ${loc?.recordedAt ? `<p class="text-xs text-gray-500 mt-1">GPS updated ${timeAgo(loc.recordedAt)}</p>` : ''}
      ${loc?.accuracy != null ? `<p class="text-xs text-gray-500">Accuracy ±${Math.round(loc.accuracy)} m</p>` : ''}
      ${isLiveVehicle ? '<p class="text-xs font-bold text-emerald-600 mt-2">● Live GPS active</p>' : ''}
    </div>
  `;

  if (loc?.latitude == null || loc?.longitude == null) return null;

  return (
    <>
      {positions.length > 1 && (
        <Polyline
          positions={positions}
          pathOptions={{
            color: routeColor,
            weight: 5,
            opacity: isLive ? 1 : 0.7,
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />
      )}
      {loc.accuracy != null && loc.accuracy > 0 && (
        <Circle
          center={[loc.latitude, loc.longitude]}
          radius={loc.accuracy}
          pathOptions={{
            color: MINT_DARK,
            fillColor: MINT,
            fillOpacity: 0.1,
            weight: 1.25,
            dashArray: '4 6'
          }}
        />
      )}
      <AnimatedVehicleMarker
        lat={loc.latitude}
        lng={loc.longitude}
        markerKey={shipment.id}
        heading={bearing}
        isLive={isLiveVehicle}
        duration={isLiveVehicle ? 1400 : 900}
        popupHtml={popupHtml}
      />
    </>
  );
}

function FallbackGpsMarker({ liveLocation, connected }) {
  if (liveLocation?.latitude == null || liveLocation?.longitude == null) {
    return null;
  }

  const popupHtml = `
    <div class="text-sm min-w-[12rem]">
      <p class="font-bold">Current GPS location</p>
      <p class="text-gray-600">No parcel is currently available on the map.</p>
      <p class="text-xs font-mono text-gray-600 mt-2">${liveLocation.latitude.toFixed(5)}, ${liveLocation.longitude.toFixed(5)}</p>
      ${connected ? '<p class="text-xs font-bold text-emerald-600 mt-2">● Live GPS active</p>' : ''}
    </div>
  `;

  return (
    <>
      {liveLocation.accuracy != null && liveLocation.accuracy > 0 && (
        <Circle
          center={[liveLocation.latitude, liveLocation.longitude]}
          radius={liveLocation.accuracy}
          pathOptions={{
            color: MINT_DARK,
            fillColor: MINT,
            fillOpacity: 0.1,
            weight: 1.25,
            dashArray: '4 6'
          }}
        />
      )}
      <AnimatedVehicleMarker
        lat={liveLocation.latitude}
        lng={liveLocation.longitude}
        markerKey="fallback-gps"
        heading={0}
        isLive={connected}
        popupHtml={popupHtml}
      />
    </>
  );
}

ShipmentMarker.propTypes = {
  shipment: PropTypes.object.isRequired,
  trail: PropTypes.array,
  connected: PropTypes.bool
};

const LiveFleetMap = ({ shipments = [], liveLocation, connected = false, isLoading = false, compact = false }) => {
  const [trails, setTrails] = useState({});
  const loadedRef = useRef(new Set());

  const mappedShipments = useMemo(
    () => shipments.map((shipment) => {
      if (liveLocation?.shipmentId !== shipment.id) {
        return shipment;
      }

      return {
        ...shipment,
        currentLocation: {
          ...shipment.currentLocation,
          ...liveLocation
        }
      };
    }),
    [shipments, liveLocation]
  );

  const mappableShipments = useMemo(
    () => mappedShipments.filter(
      s => s.currentLocation?.latitude != null
        && s.currentLocation?.longitude != null
    ),
    [mappedShipments]
  );

  useEffect(() => {
    mappableShipments.forEach(async (shipment) => {
      if (loadedRef.current.has(shipment.id)) return;
      loadedRef.current.add(shipment.id);
      try {
        const res = await fetch(`${API_URL}/api/shipments/${shipment.id}/history`);
        if (res.ok) {
          const history = await res.json();
          const ordered = [...history].sort(
            (a, b) => new Date(a.recordedAt || 0).getTime() - new Date(b.recordedAt || 0).getTime()
          );
          const fallbackPoint = shipment.currentLocation
            ? [{
              latitude: shipment.currentLocation.latitude,
              longitude: shipment.currentLocation.longitude,
              recordedAt: shipment.currentLocation.recordedAt
            }]
            : [];
          if (ordered.length > 0) {
            setTrails(prev => ({ ...prev, [shipment.id]: ordered }));
          } else if (fallbackPoint.length > 0) {
            setTrails(prev => ({ ...prev, [shipment.id]: fallbackPoint }));
          }
        }
      } catch {
        loadedRef.current.delete(shipment.id);
      }
    });
  }, [mappableShipments]);

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
    () => mappableShipments.map(s => {
      const trail = trails[s.id] || [];
      const latest = trail[trail.length - 1];
      return {
        lat: latest?.latitude ?? s.currentLocation.latitude,
        lng: latest?.longitude ?? s.currentLocation.longitude
      };
    }),
    [mappableShipments, trails]
  );

  const fallbackPoint = useMemo(() => {
    if (liveLocation?.latitude == null || liveLocation?.longitude == null) {
      return null;
    }

    return {
      lat: liveLocation.latitude,
      lng: liveLocation.longitude
    };
  }, [liveLocation]);

  const defaultCenter = markerPoints[0] || fallbackPoint || TZ_DEFAULT_CENTER;

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

  if (mappableShipments.length === 0 && !fallbackPoint) {
    return (
      <div className={`${heightClass} flex items-center justify-center ${shellBg} ${shellRound} p-8 text-center`}>
        <div>
          <p className="text-4xl mb-3">📍</p>
          <p className={`text-lg font-bold ${compact ? 'text-gray-200' : 'text-gray-900'}`}>No parcels on the map yet</p>
          <p className={`text-sm mt-2 ${compact ? 'text-gray-500' : 'text-gray-600'}`}>
            Shipments will appear here as soon as they have a saved location.
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
        <MapResizeObserver />
        <FitAllMarkers points={markerPoints.length > 0 ? markerPoints : fallbackPoint ? [fallbackPoint] : []} />

        {mappableShipments.map((shipment) => (
          <ShipmentMarker
            key={shipment.id}
            shipment={shipment}
            trail={trails[shipment.id] || []}
            connected={connected}
          />
        ))}
        {mappableShipments.length === 0 && fallbackPoint && (
          <FallbackGpsMarker liveLocation={liveLocation} connected={connected} />
        )}
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
