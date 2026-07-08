import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { createVehicleIcon } from './vehicleMarker';

function AnimatedVehicleMarker({
  lat,
  lng,
  markerKey,
  heading = 0,
  isLive = false,
  aerial = false,
  duration = 1600,
  zIndexOffset = 1000,
  popupHtml = '',
  onPositionChange,
}) {
  const map = useMap();
  const markerRef = useRef(null);
  const animRef = useRef(null);
  const posRef = useRef(null);
  const iconStateRef = useRef({ heading: null, isLive: null, aerial: null });
  const onPositionChangeRef = useRef(onPositionChange);

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  useEffect(() => {
    markerRef.current?.remove();
    markerRef.current = null;
    posRef.current = null;
    iconStateRef.current = { heading: null, isLive: null, aerial: null };
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, [markerKey]);

  useEffect(() => {
    if (!markerRef.current) return;
    if (popupHtml) {
      markerRef.current.bindPopup(popupHtml);
    }
  }, [popupHtml]);

  useEffect(() => {
    if (lat == null || lng == null) return undefined;

    const target = { lat, lng };
    const roundedHeading = Math.round(heading / 8) * 8;
    const iconChanged =
      iconStateRef.current.heading !== roundedHeading ||
      iconStateRef.current.isLive !== isLive ||
      iconStateRef.current.aerial !== aerial;
    const icon = createVehicleIcon(roundedHeading, isLive, aerial);

    if (!markerRef.current) {
      markerRef.current = L.marker([target.lat, target.lng], { icon, zIndexOffset }).addTo(map);
      posRef.current = { ...target };
      iconStateRef.current = { heading: roundedHeading, isLive, aerial };
      if (popupHtml) {
        markerRef.current.bindPopup(popupHtml);
      }
      onPositionChangeRef.current?.(posRef.current);
      return undefined;
    }

    if (iconChanged) {
      markerRef.current.setIcon(icon);
      iconStateRef.current = { heading: roundedHeading, isLive, aerial };
    }

    const start = posRef.current || target;
    const distance = Math.hypot(target.lat - start.lat, target.lng - start.lng);
    if (distance < 0.00001) {
      markerRef.current.setLatLng([target.lat, target.lng]);
      posRef.current = { ...target };
      onPositionChangeRef.current?.(posRef.current);
      return undefined;
    }

    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
    }

    const startTime = performance.now();

    const step = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const next = {
        lat: start.lat + (target.lat - start.lat) * ease,
        lng: start.lng + (target.lng - start.lng) * ease,
      };
      posRef.current = next;
      markerRef.current?.setLatLng([next.lat, next.lng]);
      onPositionChangeRef.current?.(next);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [lat, lng, heading, isLive, aerial, duration, map, zIndexOffset, markerKey]);

  useEffect(
    () => () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
      markerRef.current?.remove();
      markerRef.current = null;
    },
    [map]
  );

  return null;
}

AnimatedVehicleMarker.propTypes = {
  lat: PropTypes.number,
  lng: PropTypes.number,
  markerKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  heading: PropTypes.number,
  isLive: PropTypes.bool,
  aerial: PropTypes.bool,
  duration: PropTypes.number,
  zIndexOffset: PropTypes.number,
  popupHtml: PropTypes.string,
  onPositionChange: PropTypes.func,
};

export default AnimatedVehicleMarker;
