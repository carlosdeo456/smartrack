import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  MapContainer as LeafletMap,
  TileLayer,
  Polyline,
  CircleMarker,
  Circle,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, Spinner } from '../ui';
import TrackingBottomSheet from './TrackingBottomSheet';

import { TZ_DEFAULT_CENTER } from '../../utils/tanzaniaRegions';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const DEFAULT_CENTER = TZ_DEFAULT_CENTER;
const MINT = '#34D399';
const MINT_DARK = '#10B981';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function getBearing(from, to) {
  if (!from || !to) return 0;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLon = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function createCourierIcon(heading = 0) {
  return L.divIcon({
    className: 'bolt-driver-icon',
    html: `
      <div class="bolt-vehicle-wrap">
        <div class="bolt-vehicle-pulse"></div>
        <div class="bolt-driver-inner bolt-courier-inner" style="transform: rotate(${Math.round(heading)}deg)">
          <span class="bolt-driver-emoji" aria-hidden="true">🛵</span>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });
}

const destIcon = L.divIcon({
  className: 'bolt-dest-marker',
  html: '<div class="bolt-dest-pin"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 20]
});

function useAnimatedPosition(lat, lng, shipmentId, duration = 1800) {
  const [position, setPosition] = useState(null);
  const posRef = useRef(null);

  useEffect(() => {
    posRef.current = null;
    setPosition(null);
  }, [shipmentId]);

  useEffect(() => {
    if (lat == null || lng == null) return;

    const start = posRef.current || { lat, lng };
    const startTime = performance.now();
    let frameId;

    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const next = {
        lat: start.lat + (lat - start.lat) * ease,
        lng: start.lng + (lng - start.lng) * ease
      };
      posRef.current = next;
      setPosition(next);
      if (t < 1) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [lat, lng, duration]);

  return position || (lat != null ? { lat, lng } : null);
}

function FitRouteBounds({ points, shipmentId, bottomPadding = 52 }) {
  const map = useMap();
  const fittedRef = useRef(null);

  useEffect(() => {
    if (fittedRef.current === shipmentId || points.length === 0) return;
    fittedRef.current = shipmentId;

    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { paddingTopLeft: [52, 52], paddingBottomRight: [52, bottomPadding], maxZoom: 16 });
    } else {
      map.setView([points[0].lat, points[0].lng], 16);
    }
  }, [shipmentId, points, map, bottomPadding]);

  return null;
}

function MapFollower({ position, active }) {
  const map = useMap();

  useEffect(() => {
    if (!active || !position) return;
    map.panTo([position.lat, position.lng], { animate: true, duration: 0.85 });
  }, [position?.lat, position?.lng, active, map]);

  return null;
}

function LiveCourierMarker({ position, bearing, trackingNumber, isLive, accuracy }) {
  const icon = useMemo(
    () => createCourierIcon(bearing),
    [Math.round(bearing / 8)]
  );

  if (!position) return null;

  return (
    <>
      {accuracy != null && accuracy > 0 && (
        <Circle
          center={[position.lat, position.lng]}
          radius={accuracy}
          pathOptions={{
            color: MINT,
            fillColor: MINT,
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: '4 6'
          }}
        />
      )}
      <Marker
        position={[position.lat, position.lng]}
        icon={icon}
        zIndexOffset={1000}
      >
        <Popup>
          <span className="font-semibold">{trackingNumber || 'Parcel'}</span>
          {isLive && (
            <span className="block text-xs text-green-600 font-bold mt-1">● Live location</span>
          )}
          <span className="block text-xs text-gray-500 mt-1 font-mono">
            {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </span>
        </Popup>
      </Marker>
    </>
  );
}

LiveCourierMarker.propTypes = {
  position: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
  bearing: PropTypes.number,
  trackingNumber: PropTypes.string,
  isLive: PropTypes.bool,
  accuracy: PropTypes.number
};

const MapView = ({ selectedShipment, liveLocation, isLoading = false, connected = false, fullScreen = false, showTrackingSheet = false }) => {
  const [history, setHistory] = useState([]);
  const [plannedRoute, setPlannedRoute] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [, setClock] = useState(0);
  const [liveFlash, setLiveFlash] = useState(false);

  const isTracking = selectedShipment?.status === 'in_transit';

  useEffect(() => {
    const id = setInterval(() => setClock(c => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedShipment?.id) {
      setHistory([]);
      setPlannedRoute([]);
      setAccuracy(null);
      return;
    }

    if (selectedShipment.currentLocation?.accuracy != null) {
      setAccuracy(selectedShipment.currentLocation.accuracy);
    }

    if (selectedShipment.planned_route?.length) {
      setPlannedRoute(
        selectedShipment.planned_route.map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          recordedAt: null,
        }))
      );
    } else {
      setPlannedRoute([]);
    }

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const response = await fetch(`${API_URL}/api/shipments/${selectedShipment.id}/history`);
        if (response.ok) {
          const data = await response.json();
          if (data.length === 0 && selectedShipment.currentLocation) {
            const point = {
              latitude: selectedShipment.currentLocation.latitude,
              longitude: selectedShipment.currentLocation.longitude,
              recordedAt: selectedShipment.currentLocation.recordedAt
            };
            setHistory([point]);
            if (!selectedShipment.planned_route?.length) {
              setPlannedRoute([point]);
            }
            setLastUpdate(point.recordedAt);
          } else {
            setHistory(data);
            if (!selectedShipment.planned_route?.length) {
              setPlannedRoute(data);
            }
            if (data.length > 0) {
              setLastUpdate(data[data.length - 1].recordedAt);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching GPS history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedShipment?.id, selectedShipment?.planned_route]);

  const geoOrigin = selectedShipment?.origin_latitude != null && selectedShipment?.origin_longitude != null
    ? { lat: parseFloat(selectedShipment.origin_latitude), lng: parseFloat(selectedShipment.origin_longitude) }
    : null;
  const geoDestination = selectedShipment?.destination_latitude != null && selectedShipment?.destination_longitude != null
    ? { lat: parseFloat(selectedShipment.destination_latitude), lng: parseFloat(selectedShipment.destination_longitude) }
    : null;

  useEffect(() => {
    if (!liveLocation || !selectedShipment?.id) return;
    if (liveLocation.shipmentId !== selectedShipment.id) return;

    setLastUpdate(liveLocation.recordedAt || new Date().toISOString());
    if (liveLocation.accuracy != null) {
      setAccuracy(liveLocation.accuracy);
    }
    setLiveFlash(true);
    const timer = setTimeout(() => setLiveFlash(false), 600);

    setHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && last.latitude === liveLocation.latitude && last.longitude === liveLocation.longitude) {
        return prev;
      }
      return [
        ...prev,
        {
          latitude: liveLocation.latitude,
          longitude: liveLocation.longitude,
          recordedAt: liveLocation.recordedAt || new Date().toISOString()
        }
      ];
    });

    return () => clearTimeout(timer);
  }, [liveLocation, selectedShipment?.id]);

  const traveledPath = useMemo(
    () => history.map(p => ({ lat: p.latitude, lng: p.longitude })),
    [history]
  );

  const plannedPath = useMemo(
    () => plannedRoute.map(p => ({ lat: p.latitude, lng: p.longitude })),
    [plannedRoute]
  );

  const currentLoc = selectedShipment?.currentLocation;
  const targetLat = traveledPath.length > 0
    ? traveledPath[traveledPath.length - 1].lat
    : currentLoc?.latitude ?? null;
  const targetLng = traveledPath.length > 0
    ? traveledPath[traveledPath.length - 1].lng
    : currentLoc?.longitude ?? null;
  const animatedPosition = useAnimatedPosition(targetLat, targetLng, selectedShipment?.id, 1800);

  const previousPosition = traveledPath.length > 1 ? traveledPath[traveledPath.length - 2] : null;
  const bearing = getBearing(previousPosition, animatedPosition);

  const pickup = geoOrigin || (traveledPath.length > 0 ? traveledPath[0] : null);
  const destination = geoDestination || (plannedPath.length > 0 ? plannedPath[plannedPath.length - 1] : null);
  const mapCenter = animatedPosition || pickup || DEFAULT_CENTER;

  const routeProgress = selectedShipment?.status === 'delivered'
    ? 100
    : plannedPath.length > 1
      ? Math.min(100, Math.round((traveledPath.length / plannedPath.length) * 100))
      : isTracking ? 40 : 0;

  const mapBottomPadding = fullScreen || showTrackingSheet ? 300 : 52;
  const useBottomSheet = fullScreen || showTrackingSheet;

  const timeAgo = useCallback((dateStr) => {
    if (!dateStr) return 'Just now';
    const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (secs < 10) return 'Just now';
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  }, []);

  const mapHeightClass = fullScreen ? 'h-full min-h-[100dvh]' : 'h-[70vh] min-h-[28rem]';

  if (isLoading) {
    return (
      <Card className={`${mapHeightClass} flex items-center justify-center`}>
        <Spinner size="lg" />
      </Card>
    );
  }

  if (!selectedShipment) {
    return (
      <Card className={`${mapHeightClass} flex items-center justify-center p-8 text-center`}>
        <div>
          <p className="text-lg font-bold text-gray-900 mb-2">Select a shipment</p>
          <p className="text-sm text-gray-600">
            Choose a shipment from the sidebar to view its live Bolt-style route on the map.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${mapHeightClass} overflow-hidden relative border-0 ${fullScreen ? 'rounded-none shadow-none' : 'shadow-lg'}`}>
      <LeafletMap
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={isTracking ? 17 : 14}
        className={`h-full w-full z-0 ${fullScreen ? 'live-track-map' : ''}`}
        scrollWheelZoom
        zoomControl={!fullScreen}
      >
        <TileLayer
          attribution={OSM_ATTRIBUTION}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitRouteBounds
          points={
            plannedPath.length > 1
              ? plannedPath
              : traveledPath.length
                ? traveledPath
                : geoOrigin && geoDestination
                  ? [geoOrigin, geoDestination]
                  : [mapCenter]
          }
          shipmentId={selectedShipment.id}
          bottomPadding={mapBottomPadding}
        />
        <MapFollower position={animatedPosition} active={isTracking} />

        {plannedPath.length > 1 && (
          <Polyline
            positions={plannedPath.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: '#d1d5db',
              weight: 5,
              opacity: 0.7,
              dashArray: '10 14'
            }}
          />
        )}

        {traveledPath.length > 0 && (
          <Polyline
            positions={traveledPath.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: MINT,
              weight: 6,
              opacity: 1,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}

        {pickup && (
          <CircleMarker
            center={[pickup.lat, pickup.lng]}
            radius={8}
            pathOptions={{
              color: MINT_DARK,
              fillColor: MINT,
              fillOpacity: 0.95,
              weight: 2
            }}
          >
            <Popup>
              Pickup · {selectedShipment.origin_location || 'Origin'}
            </Popup>
          </CircleMarker>
        )}

        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
            <Popup>
              Delivery · {selectedShipment.destination_location || 'Destination'}
            </Popup>
          </Marker>
        )}

        <LiveCourierMarker
          position={animatedPosition}
          bearing={bearing}
          trackingNumber={selectedShipment.tracking_number}
          isLive={isTracking && connected}
          accuracy={accuracy}
        />
      </LeafletMap>

      {useBottomSheet ? (
        <TrackingBottomSheet
          shipment={selectedShipment}
          routeProgress={routeProgress}
          isTracking={isTracking}
          connected={connected}
          liveFlash={liveFlash}
        />
      ) : (
        <>
          {selectedShipment && (
            <div className="absolute left-4 right-4 top-4 z-[1000] pointer-events-none">
              <div className="bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{selectedShipment.tracking_number}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {selectedShipment.status?.replace('_', ' ')} · {selectedShipment.destination_location}
                  </p>
                </div>
                {isTracking && (
                  <div className="flex items-center gap-2">
                    {!connected && (
                      <span className="text-xs text-amber-600 font-medium">Reconnecting…</span>
                    )}
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
                      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
                      LIVE
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedShipment && animatedPosition && (
            <div className="absolute bottom-4 left-4 right-4 z-[1000] pointer-events-none">
              <div className={`bg-white text-gray-900 rounded-2xl shadow-xl px-4 py-3 transition-shadow duration-300 border border-gray-100 ${liveFlash ? 'tracking-bottom-sheet--flash' : ''}`}>
                <div className="flex justify-between items-center mb-2">
                  <p className="font-semibold text-sm">
                    {isTracking
                      ? `Arriving in ${Math.max(1, Math.round((100 - routeProgress) / 5))} min`
                      : `Route to ${selectedShipment.destination_location}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {timeAgo(lastUpdate || selectedShipment.currentLocation?.recordedAt)}
                  </p>
                </div>
                <div className="tracking-progress-track">
                  <div
                    className="tracking-progress-fill"
                    style={{ width: `${routeProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  {routeProgress}% complete · from {selectedShipment.origin_location}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {loadingHistory && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white/90 px-4 py-2 rounded-full text-sm shadow">
          Loading route...
        </div>
      )}
    </Card>
  );
};

MapView.propTypes = {
  selectedShipment: PropTypes.object,
  liveLocation: PropTypes.object,
  isLoading: PropTypes.bool,
  connected: PropTypes.bool,
  fullScreen: PropTypes.bool,
  showTrackingSheet: PropTypes.bool
};

export default MapView;
