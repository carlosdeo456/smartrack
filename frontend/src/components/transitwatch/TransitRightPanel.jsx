import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import { regionLabel } from '../../utils/tanzaniaRegions';

function routeLabel(origin, dest) {
  return regionLabel(origin, dest);
}

function routeHealth(alerts, routeKey) {
  const count = alerts.filter(a => a._route === routeKey).length;
  if (count >= 2) return { cls: 'status-crit', color: 'var(--tw-red2)', count };
  if (count === 1) return { cls: 'status-warn', color: 'var(--tw-amber2)', count };
  return { cls: 'status-ok', color: 'var(--tw-green2)', count };
}

const TransitRightPanel = ({ shipments, alerts, connected }) => {
  const inTransit = shipments.filter(s => s.status === 'in_transit');

  const routes = useMemo(() => {
    const map = new Map();
    shipments.forEach(s => {
      const key = `${s.origin_location} → ${s.destination_location}`;
      if (!map.has(key)) map.set(key, { key, parcels: 0, alerts: 0 });
      const r = map.get(key);
      r.parcels += 1;
    });
    alerts.forEach(a => {
      const s = shipments.find(sh => sh.id === a.shipmentId);
      if (!s) return;
      const key = `${s.origin_location} → ${s.destination_location}`;
      a._route = key;
      if (map.has(key)) map.get(key).alerts += 1;
    });
    return [...map.values()].slice(0, 6);
  }, [shipments, alerts]);

  const feed = alerts.slice(0, 8);

  const dotColor = (sev) => {
    if (sev === 'critical' || sev === 'high') return 'var(--tw-red)';
    if (sev === 'medium') return 'var(--tw-amber)';
    return 'var(--tw-accent)';
  };

  return (
    <aside className="right-panel">
      <div className="panel-section">
        <div className="panel-section-title">Active Vehicles</div>
        {inTransit.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--tw-muted)' }}>No vehicles en route.</p>
        ) : (
          inTransit.slice(0, 4).map(s => {
            const hasAlert = alerts.some(a => a.shipmentId === s.id);
            const progress = 40 + (s.id % 5) * 12;
            return (
              <Link
                key={s.id}
                to={`/track/${encodeURIComponent(s.tracking_number)}`}
                className="vehicle-card"
              >
                <div className="vehicle-header">
                  <span className="vehicle-id">{s.tracking_number}</span>
                  <span className="vehicle-status" style={{ color: hasAlert ? 'var(--tw-amber2)' : 'var(--tw-green2)' }}>
                    <i className={`fas ${hasAlert ? 'fa-exclamation-circle' : 'fa-check-circle'}`} />
                    {hasAlert ? ' ALERT' : ' ON TRACK'}
                  </span>
                </div>
                <div className="vehicle-meta" style={{ marginBottom: 4 }}>
                  {routeLabel(s.origin_location, s.destination_location)}
                  {connected ? ' · LIVE' : ''}
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${hasAlert ? 'progress-warn' : 'progress-ok'}`}
                    style={{ width: `${Math.min(progress, 95)}%` }}
                  />
                </div>
                <div className="vehicle-meta">To {s.destination_location}</div>
              </Link>
            );
          })
        )}
      </div>

      <div className="panel-section">
        <div className="panel-section-title">Route Health</div>
        {routes.map(r => {
          const h = routeHealth(alerts, r.key);
          return (
            <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--tw-border)' }}>
              <div style={{ flex: 1, fontSize: 12 }}>{routeLabel(r.key.split(' → ')[0], r.key.split(' → ')[1])}</div>
              <div style={{ fontSize: 12, fontFamily: 'var(--tw-mono)', color: h.color }}>{r.alerts} alerts</div>
            </div>
          );
        })}
      </div>

      <div className="panel-section" style={{ flex: 1 }}>
        <div className="panel-section-title">Live Activity Feed</div>
        {feed.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--tw-muted)' }}>No recent activity.</p>
        ) : (
          feed.map(alert => (
            <div key={alert.id} className="feed-item">
              <div className="feed-dot" style={{ background: dotColor(alert.severity) }} />
              <div>
                <div className="feed-msg">
                  {alert.trackingNumber} — {alert.title}
                </div>
                <div className="feed-time">
                  {new Date(alert.createdAt).toLocaleTimeString('en-GB')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

TransitRightPanel.propTypes = {
  shipments: PropTypes.array,
  alerts: PropTypes.array,
  connected: PropTypes.bool
};

export default TransitRightPanel;
