import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  MapContainer as LeafletMap,
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
import AnimatedVehicleMarker from '../map/AnimatedVehicleMarker';
import AerialMapLayers from '../map/AerialMapLayers';
import { getBearing } from '../map/vehicleMarker';
import { LIVE_AERIAL_ZOOM, LIVE_STREET_ZOOM } from '../../utils/mapTiles';

import { TZ_DEFAULT_CENTER } from '../../utils/tanzaniaRegions';

import { API_URL } from '../../utils/apiConfig';
const DEFAULT_CENTER = TZ_DEFAULT_CENTER;
const MINT = '#34D399';
const MINT_DARK = '#10B981';

const destIcon = L.divIcon({
  className: 'bolt-dest-marker',
  html: '<div class="bolt-dest-pin"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 20]
});

function pointKey(points) {
  return points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
}

function isDefaultCenter(point) {
  return (
    Math.abs(point.lat - DEFAULT_CENTER.lat) < 0.001 &&
    Math.abs(point.lng - DEFAULT_CENTER.lng) < 0.001
  );
}

function FitRouteBounds({ points, shipmentId, bottomPadding = 52, followActive = false, aerial = false }) {
  const map = useMap();
  const fittedForShipmentRef = useRef(null);
  const lastKeyRef = useRef('');

  useEffect(() => {
    fittedForShipmentRef.current = null;
    lastKeyRef.current = '';
  }, [shipmentId]);

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1 && isDefaultCenter(points[0])) return;

    const key = `${pointKey(points)}|${bottomPadding}`;
    if (lastKeyRef.current === key) return;
    if (followActive && fittedForShipmentRef.current === shipmentId) return;

    lastKeyRef.current = key;
    fittedForShipmentRef.current = shipmentId;

    map.invalidateSize();
    const closeZoom = aerial ? LIVE_AERIAL_ZOOM : LIVE_STREET_ZOOM;
    const maxZoom = aerial ? 19 : 16;
    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, {
        paddingTopLeft: [52, 52],
        paddingBottomRight: [52, bottomPadding],
        maxZoom,
      });
    } else {
      map.setView([points[0].lat, points[0].lng], closeZoom);
    }
  }, [shipmentId, points, map, bottomPadding, followActive, aerial]);

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

function MapFollower({ position, active, aerial = false }) {
  const map = useMap();
  const zoomRef = useRef(null);

  useEffect(() => {
    if (!active || !position) return;
    const targetZoom = aerial ? LIVE_AERIAL_ZOOM : map.getZoom();
    if (zoomRef.current !== targetZoom) {
      zoomRef.current = targetZoom;
      map.setView([position.lat, position.lng], targetZoom, { animate: true, duration: 0.85 });
      return;
    }
    map.panTo([position.lat, position.lng], { animate: true, duration: 0.85 });
  }, [position?.lat, position?.lng, active, aerial, map]);

  useEffect(() => {
    zoomRef.current = null;
  }, [active, aerial]);

  return null;
}

const MapView = ({
  selectedShipment,
  liveLocation,
  isLoading = false,
  connected = false,
  fullScreen = false,
  showTrackingSheet = false,
  gpsOnly = false,
  aerialView = false
}) => {
  const [history, setHistory] = useState([]);
  const [plannedRoute, setPlannedRoute] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [, setClock] = useState(0);
  const [liveFlash, setLiveFlash] = useState(false);
  const [followPosition, setFollowPosition] = useState(null);

  const handlePositionChange = useCallback((position) => {
    setFollowPosition(position);
  }, []);

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

  useEffect(() => {
    setFollowPosition(null);
  }, [selectedShipment?.id]);

  const liveTarget = liveLocation?.shipmentId === selectedShipment?.id ? liveLocation : null;
  const currentLoc = selectedShipment?.currentLocation;
  const targetLat = liveTarget?.latitude
    ?? (traveledPath.length > 0 ? traveledPath[traveledPath.length - 1].lat : currentLoc?.latitude ?? null);
  const targetLng = liveTarget?.longitude
    ?? (traveledPath.length > 0 ? traveledPath[traveledPath.length - 1].lng : currentLoc?.longitude ?? null);

  const previousPosition = traveledPath.length > 1 ? traveledPath[traveledPath.length - 2] : null;
  const bearing = getBearing(
    previousPosition,
    targetLat != null && targetLng != null ? { lat: targetLat, lng: targetLng } : null
  );

  const hasTrackerLive = Boolean(liveTarget)
    || Boolean(selectedShipment?.currentLocation?.fromTracker);
  const isLiveVehicle = isTracking || hasTrackerLive;
  const followLive = followPosition != null && (isTracking || Boolean(liveTarget) || (fullScreen && hasTrackerLive));

  const vehiclePopupHtml = useMemo(() => {
    if (targetLat == null || targetLng == null) return '';
    const lines = [
      `<span class="font-semibold">${selectedShipment?.tracking_number || 'Parcel'}</span>`,
    ];
    if (isLiveVehicle) {
      lines.push('<span class="block text-xs text-green-600 font-bold mt-1">● Live location</span>');
    }
    lines.push(
      `<span class="block text-xs text-gray-500 mt-1 font-mono">${targetLat.toFixed(5)}, ${targetLng.toFixed(5)}</span>`
    );
    return lines.join('');
  }, [selectedShipment?.tracking_number, isLiveVehicle, targetLat, targetLng]);

  const pickup = gpsOnly
    ? (traveledPath.length > 0 ? traveledPath[0] : null)
    : geoOrigin || (traveledPath.length > 0 ? traveledPath[0] : null);
  const destination = gpsOnly
    ? null
    : geoDestination || (plannedPath.length > 0 ? plannedPath[plannedPath.length - 1] : null);
  const mapCenter = followPosition || pickup || DEFAULT_CENTER;

  const routeProgress = selectedShipment?.status === 'delivered'
    ? 100
    : plannedPath.length > 1
      ? Math.min(100, Math.round((traveledPath.length / plannedPath.length) * 100))
      : isTracking ? 40 : 0;

  const useAerialView = aerialView || (fullScreen && gpsOnly);
  const liveZoom = useAerialView ? LIVE_AERIAL_ZOOM : LIVE_STREET_ZOOM;

  const mapBottomPadding = fullScreen || showTrackingSheet ? 300 : 52;
  const useBottomSheet = fullScreen || showTrackingSheet;

  const fitPoints = useMemo(() => {
    if (!gpsOnly && plannedPath.length > 1) return plannedPath;
    if (traveledPath.length > 0) return traveledPath;
    if (!gpsOnly && geoOrigin && geoDestination) return [geoOrigin, geoDestination];
    if (targetLat != null && targetLng != null) return [{ lat: targetLat, lng: targetLng }];
    if (!gpsOnly && geoOrigin) return [geoOrigin];
    if (!gpsOnly && geoDestination) return [geoDestination];
    return [DEFAULT_CENTER];
  }, [
    gpsOnly,
    plannedPath,
    traveledPath,
    geoOrigin,
    geoDestination,
    targetLat,
    targetLng,
  ]);

  const timeAgo = useCallback((dateStr) => {
    if (!dateStr) return 'Just now';
    const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (secs < 10) return 'Just now';
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  }, []);

  const mapHeightClass = fullScreen ? 'h-full min-h-0' : 'h-[70vh] min-h-[28rem]';

  const mapShellClass = `${mapHeightClass} ${fullScreen ? 'absolute inset-0 rounded-none shadow-none' : ''}`;

  if (isLoading) {
    return (
      <Card className={`${mapShellClass} flex items-center justify-center ${fullScreen ? 'border-0' : ''}`}>
        <Spinner size="lg" />
      </Card>
    );
  }

  if (!selectedShipment) {
    return (
      <Card className={`${mapShellClass} flex items-center justify-center p-8 text-center ${fullScreen ? 'border-0' : ''}`}>
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
    <Card className={`${mapShellClass} overflow-hidden relative border-0 ${fullScreen ? '' : 'shadow-lg'}`}>
      <LeafletMap
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={isTracking ? liveZoom : useAerialView ? 15 : 14}
        className={`h-full w-full z-0 ${fullScreen ? 'live-track-map' : ''} ${useAerialView ? 'live-track-map--aerial' : ''}`}
        scrollWheelZoom
        zoomControl={!fullScreen}
      >
        <AerialMapLayers aerial={useAerialView} />

        <MapResizeObserver />
        <FitRouteBounds
          points={fitPoints}
          shipmentId={selectedShipment.id}
          bottomPadding={mapBottomPadding}
          followActive={isTracking || (gpsOnly && hasTrackerLive)}
          aerial={useAerialView}
        />
        <MapFollower position={followPosition} active={followLive} aerial={useAerialView} />

        {!gpsOnly && plannedPath.length > 1 && (
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
          <>
            {useAerialView && (
              <Polyline
                positions={traveledPath.map((p) => [p.lat, p.lng])}
                pathOptions={{
                  color: '#ffffff',
                  weight: 10,
                  opacity: 0.85,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}
            <Polyline
              positions={traveledPath.map(p => [p.lat, p.lng])}
              pathOptions={{
                color: useAerialView ? '#22d3ee' : MINT,
                weight: useAerialView ? 5 : 6,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          </>
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
              {gpsOnly ? 'First GPS point' : `Pickup · ${selectedShipment.origin_location || 'Origin'}`}
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

        {targetLat != null && targetLng != null && (
          <>
            {accuracy != null && accuracy > 0 && followPosition && (
              <Circle
                center={[followPosition.lat, followPosition.lng]}
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
            <AnimatedVehicleMarker
              lat={targetLat}
              lng={targetLng}
              markerKey={selectedShipment.id}
              heading={bearing}
              isLive={isLiveVehicle}
              aerial={useAerialView}
              duration={isLiveVehicle ? 1600 : 1200}
              popupHtml={vehiclePopupHtml}
              onPositionChange={handlePositionChange}
            />
          </>
        )}
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

          {selectedShipment && followPosition && (
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
  showTrackingSheet: PropTypes.bool,
  gpsOnly: PropTypes.bool,
  aerialView: PropTypes.bool
};

export default MapView;
