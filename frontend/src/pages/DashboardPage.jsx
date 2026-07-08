import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LiveFleetMap, CreateShipmentModal, ShipmentTicketModal } from '../components/features';
import TransitAlertsTable from '../components/transitwatch/TransitAlertsTable';
import TransitRightPanel from '../components/transitwatch/TransitRightPanel';
import { useNotification, ThemeToggle } from '../components/common';
import { useAuth } from '../context/AuthContext';
import { useLiveTracking } from '../hooks/useLiveTracking';
import { apiFetch } from '../services/api';

import { regionLabel } from '../utils/tanzaniaRegions';

import { API_URL } from '../utils/apiConfig';

function routeKey(s) {
  return `${s.origin_location} → ${s.destination_location}`;
}

function routeShort(origin, dest) {
  return regionLabel(origin, dest);
}

const DashboardPage = () => {
  const [shipments, setShipments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [ticketShipment, setTicketShipment] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [clock, setClock] = useState('');
  const { addNotification } = useNotification();
  const { user } = useAuth();

  const { connected } = useLiveTracking({
    onLocationChange: (data) => {
      setLiveLocation(data);
      setShipments(prev =>
        prev.map(s => (s.id === data.shipmentId ? { ...s, currentLocation: data } : s))
      );
    },
    onAlert: (alert) => {
      setAlerts(prev => [alert, ...prev.filter(a => a.id !== alert.id)]);
      addNotification(`${alert.title} (${alert.trackingNumber})`, 'error');
    }
  });

  useEffect(() => {
    const tick = () => setClock(new Date().toTimeString().slice(0, 8));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchAlerts = async () => {
    try {
      setAlerts(await apiFetch('/api/alerts?resolved=false'));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchShipments = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shipments`);
      if (res.ok) setShipments(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
    fetchAlerts();
  }, [fetchShipments]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchShipments({ silent: true });
    }, 15000);

    return () => clearInterval(intervalId);
  }, [fetchShipments]);

  const metrics = useMemo(() => {
    const critical = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
    const warning = alerts.filter(a => a.severity === 'medium').length;
    const delivered = shipments.filter(s => s.status === 'delivered').length;
    const enRoute = shipments.filter(s => s.status === 'in_transit').length;
    return { critical, warning, delivered, enRoute };
  }, [alerts, shipments]);

  const routes = useMemo(() => {
    const map = new Map();
    shipments.forEach(s => {
      const key = routeKey(s);
      if (!map.has(key)) {
        map.set(key, { key, label: routeShort(s.origin_location, s.destination_location), parcels: 0, alertCount: 0 });
      }
      map.get(key).parcels += 1;
    });
    alerts.forEach(a => {
      const s = shipments.find(sh => sh.id === a.shipmentId);
      if (!s) return;
      const key = routeKey(s);
      if (map.has(key)) map.get(key).alertCount += 1;
    });
    return [...map.values()];
  }, [shipments, alerts]);

  const latestGpsLocation = useMemo(() => {
    const candidates = shipments
      .filter((shipment) => shipment.currentLocation?.latitude != null && shipment.currentLocation?.longitude != null)
      .map((shipment) => ({
        trackingNumber: shipment.tracking_number,
        ...shipment.currentLocation,
      }));

    if (liveLocation?.latitude != null && liveLocation?.longitude != null) {
      candidates.unshift({
        trackingNumber: shipments.find((shipment) => shipment.id === liveLocation.shipmentId)?.tracking_number,
        ...liveLocation,
      });
    }

    if (candidates.length === 0) return null;

    return candidates.sort(
      (a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime()
    )[0];
  }, [shipments, liveLocation]);

  const routeStatus = (count) => {
    if (count >= 2) return 'status-crit';
    if (count === 1) return 'status-warn';
    return 'status-ok';
  };

  const canCreate = user && ['admin', 'customer', 'driver'].includes(user.role);

  return (
    <>
      <div className="tw-layout">
        <aside className="sidebar">
          <div className="sidebar-scroll">
            <div className="sidebar-section">
              <div className="sidebar-label">Dashboard</div>
              {canCreate && (
                <button type="button" className="nav-item" onClick={() => setShowCreateModal(true)}>
                  <span className="nav-icon"><i className="fas fa-plus" /></span>
                  New shipment
                </button>
              )}
              <Link to="/" className="nav-item active">
                <span className="nav-icon"><i className="fas fa-tachometer-alt" /></span>
                Overview
                {alerts.length > 0 && <span className="tw-badge badge-red">{alerts.length}</span>}
              </Link>
              <Link to="/map" className="nav-item">
                <span className="nav-icon"><i className="fas fa-map-marked-alt" /></span>
                Live Tracking
              </Link>
              <Link to="/track" className="nav-item">
                <span className="nav-icon"><i className="fas fa-box" /></span>
                Track by Number
              </Link>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-label">Routes</div>
              <button
                type="button"
                className={`route-item ${!activeRoute ? 'active' : ''}`}
                onClick={() => setActiveRoute(null)}
              >
                <div className="route-name"><span className="route-status status-ok" />All routes</div>
                <div className="route-meta">{shipments.length} parcels</div>
              </button>
              {routes.map(r => (
                <button
                  key={r.key}
                  type="button"
                  className={`route-item ${activeRoute === r.key ? 'active' : ''}`}
                  onClick={() => setActiveRoute(r.key)}
                >
                  <div className="route-name">
                    <span className={`route-status ${routeStatus(r.alertCount)}`} />
                    {r.label}
                  </div>
                  <div className="route-meta">{r.parcels} parcels · {r.alertCount} alerts</div>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-theme-section">
            <div className="sidebar-label">Appearance</div>
            <ThemeToggle variant="dashboard" />
          </div>
        </aside>

        <main className="main">
          <div className="metrics-row">
            <div className="metric-card red">
              <div className="metric-label">CRITICAL ALERTS</div>
              <div className="metric-value red">{metrics.critical}</div>
              <div className="metric-sub">Active right now</div>
            </div>
            <div className="metric-card amber">
              <div className="metric-label">WARNINGS</div>
              <div className="metric-value amber">{metrics.warning}</div>
              <div className="metric-sub">Needs attention</div>
            </div>
            <div className="metric-card green">
              <div className="metric-label">DELIVERED</div>
              <div className="metric-value green">{metrics.delivered}</div>
              <div className="metric-sub">Total completed</div>
            </div>
            <div className="metric-card blue">
              <div className="metric-label">VEHICLES EN ROUTE</div>
              <div className="metric-value blue">{metrics.enRoute}</div>
              <div className="metric-sub">Across {routes.length} routes</div>
            </div>
          </div>

          <div className="map-panel">
            <div className="map-header">
              <div className="section-title">
                <i className="fas fa-map" style={{ marginRight: 6, color: 'var(--tw-muted)' }} />
                Network Map — Tanzania
              </div>
              <div className="map-header-tags">
                <span className="live-pill">
                  <div className="pulse" style={connected ? {} : { background: 'var(--tw-amber)' }} />
                  <span>{connected ? `LIVE · ${clock}` : `RECONNECTING · ${clock}`}</span>
                </span>
                <span className="tag"><i className="fas fa-satellite-dish" /> GPS {connected ? 'LIVE' : '…'}</span>
                {latestGpsLocation && (
                  <span className="tag" title={latestGpsLocation.trackingNumber || 'Latest GPS point'}>
                    <i className="fas fa-location-arrow" /> {latestGpsLocation.latitude.toFixed(4)},{' '}
                    {latestGpsLocation.longitude.toFixed(4)}
                  </span>
                )}
              </div>
            </div>
            <div className="map-canvas fleet-compact">
              <LiveFleetMap
                shipments={activeRoute
                  ? shipments.filter(s => routeKey(s) === activeRoute)
                  : shipments}
                liveLocation={liveLocation}
                connected={connected}
                isLoading={loading}
                compact
              />
            </div>
          </div>

          <TransitAlertsTable
            alerts={alerts}
            shipments={shipments}
            onResolve={(resolved) => setAlerts(prev => prev.filter(a => a.id !== resolved.id))}
            filterRoute={activeRoute}
          />
        </main>

        <TransitRightPanel shipments={shipments} alerts={alerts} connected={connected} />
      </div>

      <CreateShipmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(shipment) => {
          setShipments(prev => [shipment, ...prev]);
          addNotification(`Shipment ${shipment.tracking_number} created`, 'success');
          if (shipment.sms?.sent?.length) {
            const msg = shipment.sms.simulated
              ? `SMS logged for ${shipment.sms.sent.length} phone(s) — set Twilio env vars for real delivery`
              : `SMS sent to ${shipment.sms.sent.length} phone(s)`;
            addNotification(msg, 'success');
          }
        }}
        onTicketReady={setTicketShipment}
      />

      <ShipmentTicketModal
        shipment={ticketShipment}
        onClose={() => setTicketShipment(null)}
        onAssignmentChange={(updated) => {
          setShipments((prev) =>
            prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
          );
          setTicketShipment(updated);
        }}
      />
    </>
  );
};

export default DashboardPage;
