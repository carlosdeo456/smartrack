import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer } from '../components/features';
import ShipmentChatPanel from '../components/tracking/ShipmentChatPanel';
import TrackingSidebar from '../components/tracking/TrackingSidebar';
import { useLiveTracking } from '../hooks/useLiveTracking';
import { normalizeTrackingNumber } from '../utils/tracking';
import { Spinner } from '../components/ui';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function isLocationNewer(nextLocation, currentLocation) {
  const nextTs = nextLocation?.recordedAt ? new Date(nextLocation.recordedAt).getTime() : 0;
  const currentTs = currentLocation?.recordedAt ? new Date(currentLocation.recordedAt).getTime() : 0;
  return nextTs >= currentTs;
}

const LiveTrackPage = () => {
  const { trackingNumber: urlTrackingNumber } = useParams();
  const navigate = useNavigate();
  const [trackingInput, setTrackingInput] = useState(urlTrackingNumber || '');
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(!!urlTrackingNumber);
  const [error, setError] = useState(null);
  const [shareHint, setShareHint] = useState('');
  const shipmentRef = useRef(null);

  const { liveLocation, connected } = useLiveTracking({
    onLocationChange: (data) => {
      if (shipmentRef.current?.id === data.shipmentId) {
        setShipment(prev => ({ ...prev, currentLocation: data }));
      }
    }
  });

  useEffect(() => {
    shipmentRef.current = shipment;
  }, [shipment]);

  useEffect(() => {
    if (urlTrackingNumber) {
      const normalized = normalizeTrackingNumber(urlTrackingNumber);
      setTrackingInput(normalized);
      loadShipment(normalized);
    }
  }, [urlTrackingNumber]);

  const refreshLatestTelemetry = useCallback(async (trackingNumber, currentShipment = null) => {
    const normalized = normalizeTrackingNumber(trackingNumber);
    if (!normalized) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/iot/shipments/${encodeURIComponent(normalized)}/latest`);
      if (!response.ok) return;

      const payload = await response.json();
      const latestLocation = payload?.data?.location;
      if (latestLocation?.latitude == null || latestLocation?.longitude == null) return;

      setShipment((prev) => {
        const base = prev || currentShipment;
        if (!base) return prev;
        if (!isLocationNewer(latestLocation, base.currentLocation)) return base;
        return { ...base, currentLocation: latestLocation };
      });
    } catch {
      // Tracking page should still work with the shipment payload even if telemetry refresh fails.
    }
  }, []);

  const loadShipment = async (trackingNumber) => {
    const trimmed = normalizeTrackingNumber(trackingNumber);
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/shipments/track/${encodeURIComponent(trimmed)}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('No shipment found with that tracking number. Check the ID and try again.');
          setShipment(null);
          return;
        }
        throw new Error('Failed to load shipment');
      }

      const data = await response.json();
      setShipment(data);
      setTrackingInput(data.tracking_number);
      refreshLatestTelemetry(data.tracking_number, data);
    } catch (err) {
      setError(err.message || 'Unable to load tracking data');
      setShipment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!shipment?.tracking_number) return undefined;

    const intervalId = setInterval(() => {
      refreshLatestTelemetry(shipment.tracking_number);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [shipment?.tracking_number, refreshLatestTelemetry]);

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = normalizeTrackingNumber(trackingInput);
    if (!trimmed) return;
    setTrackingInput(trimmed);
    navigate(`/track/${encodeURIComponent(trimmed)}`);
    loadShipment(trimmed);
  };

  const handleShare = useCallback(async () => {
    if (!shipment?.tracking_number) return;
    const url = `${window.location.origin}/track/${encodeURIComponent(shipment.tracking_number)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Track ${shipment.tracking_number}`,
          text: `Track parcel ${shipment.tracking_number}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShareHint('Copied!');
        setTimeout(() => setShareHint(''), 2000);
      }
    } catch {
      /* cancelled */
    }
  }, [shipment?.tracking_number]);

  /* ——— Track search landing (FedEx / DHL style) ——— */
  if (!urlTrackingNumber && !shipment) {
    return (
      <div className="tracking-portal">
        <header className="tracking-portal-header">
          <Link to="/" className="tracking-portal-logo">
            <span className="tracking-portal-logo-mark">🚚</span>
            SmartTrack
          </Link>
          <div className="tracking-portal-header-actions">
            <Link to="/login">Sign in</Link>
          </div>
        </header>

        <div className="tracking-hero">
          <h1>Track your shipment</h1>
          <p>Enter your tracking number to see live location, delivery status, and estimated arrival.</p>

          <div className="tracking-search-card">
            <form onSubmit={handleSearch}>
              <label htmlFor="tracking-search">Tracking number</label>
              <div className="tracking-search-row">
                <input
                  id="tracking-search"
                  className="tracking-search-input"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="e.g. ST-7-K9F3A2"
                  autoFocus
                />
                <button
                  type="submit"
                  className="tracking-search-btn"
                  disabled={!trackingInput.trim()}
                >
                  Track
                </button>
              </div>
            </form>
            {error && <div className="tracking-error">{error}</div>}
          </div>

          <div className="tracking-features">
            <div className="tracking-feature">
              <strong>Live map</strong>
              <span>Follow your parcel in real time on the route</span>
            </div>
            <div className="tracking-feature">
              <strong>Status updates</strong>
              <span>In transit → Delivered</span>
            </div>
            <div className="tracking-feature">
              <strong>Mobile friendly</strong>
              <span>Same link works on phone and web</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ——— Active tracking view ——— */
  return (
    <div className="tracking-portal">
      <header className="tracking-portal-header">
        <Link to="/track" className="tracking-portal-logo">
          <span className="tracking-portal-logo-mark">🚚</span>
          SmartTrack
        </Link>
        <div className="tracking-portal-header-actions">
          {shipment && (
            <button type="button" onClick={handleShare}>
              {shareHint || 'Share link'}
            </button>
          )}
          <Link to="/login">Sign in</Link>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="tracking-hero">
          <div className="tracking-error">{error}</div>
          <button
            type="button"
            className="tracking-search-btn mt-4"
            onClick={() => navigate('/track')}
          >
            Try another number
          </button>
        </div>
      ) : shipment ? (
        <div className="tracking-live-layout">
          <TrackingSidebar shipment={{ ...shipment, currentLocation: liveLocation || shipment.currentLocation }} connected={connected} />
          <div className="tracking-live-map flex flex-col min-h-0">
            <div className="tracking-mobile-bar md:hidden">
              <button
                type="button"
                className="tracking-icon-btn"
                onClick={() => navigate('/track')}
                aria-label="Back"
              >
                ←
              </button>
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <input
                  className="tracking-search-input"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Tracking number"
                />
                <button type="submit" className="tracking-search-btn" style={{ padding: '10px 16px' }}>
                  Go
                </button>
              </form>
            </div>
            <div className="flex-1 min-h-[45vh] relative">
              <MapContainer
                key={shipment.tracking_number}
                selectedShipment={{ ...shipment, currentLocation: liveLocation || shipment.currentLocation }}
                liveLocation={liveLocation || shipment.currentLocation}
                connected={connected}
                fullScreen
                showTrackingSheet
                gpsOnly
              />
            </div>
            <ShipmentChatPanel shipment={shipment} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LiveTrackPage;
