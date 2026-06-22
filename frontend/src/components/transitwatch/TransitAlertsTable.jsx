import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../services/api';

const ALERT_ICONS = {
  temperature_high: { cls: 'icon-temp', icon: 'fa-thermometer-full' },
  temperature_low: { cls: 'icon-temp', icon: 'fa-thermometer-empty' },
  humidity_high: { cls: 'icon-temp', icon: 'fa-tint' },
  humidity_low: { cls: 'icon-scan', icon: 'fa-tint-slash' },
  delay: { cls: 'icon-delay', icon: 'fa-clock' },
  default: { cls: 'icon-default', icon: 'fa-exclamation-circle' }
};

function mapSeverity(severity) {
  if (severity === 'critical' || severity === 'high') return 'critical';
  if (severity === 'medium') return 'warning';
  return 'info';
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const TransitAlertsTable = ({ alerts, shipments, onResolve, filterRoute }) => {
  const [filter, setFilter] = useState('all');

  const shipmentMap = Object.fromEntries(shipments.map(s => [s.id, s]));

  const filtered = alerts.filter(a => {
    const sev = mapSeverity(a.severity);
    if (filter !== 'all' && sev !== filter) return false;
    if (filterRoute) {
      const s = shipmentMap[a.shipmentId];
      if (!s) return false;
      const route = `${s.origin_location} → ${s.destination_location}`;
      if (route !== filterRoute) return false;
    }
    return true;
  });

  const handleResolve = async (e, alertId) => {
    e.stopPropagation();
    try {
      const resolved = await apiFetch(`/api/alerts/${alertId}/resolve`, { method: 'PUT' });
      onResolve(resolved);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-exclamation-triangle" style={{ color: 'var(--tw-red)', marginRight: 6 }} />
          Active Alerts
        </div>
        <div className="section-actions">
          {['all', 'critical', 'warning', 'info'].map(f => (
            <button
              key={f}
              type="button"
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="alerts-panel">
        {filtered.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--tw-muted)', fontSize: 13 }}>No active alerts — all sensors normal.</p>
        ) : (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Alert</th>
                <th>Parcel</th>
                <th>Route</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(alert => {
                const sev = mapSeverity(alert.severity);
                const sevClass = sev === 'critical' ? 'sev-critical' : sev === 'warning' ? 'sev-warning' : 'sev-info';
                const icon = ALERT_ICONS[alert.alertType] || ALERT_ICONS.default;
                const shipment = shipmentMap[alert.shipmentId];
                const route = shipment
                  ? `${shipment.origin_location} → ${shipment.destination_location}`
                  : '—';

                return (
                  <tr key={alert.id}>
                    <td>
                      <span className={`severity-badge ${sevClass} ${sev === 'critical' ? 'critical-blink' : ''}`}>
                        <i className="fas fa-circle" style={{ fontSize: 6 }} /> {sev.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className={`alert-type-icon ${icon.cls}`}>
                          <i className={`fas ${icon.icon}`} />
                        </div>
                        <div>
                          <div className="alert-primary">{alert.title}</div>
                          <div className="alert-secondary">{alert.description}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {alert.trackingNumber ? (
                        <Link to={`/track/${encodeURIComponent(alert.trackingNumber)}`} className="parcel-id">
                          {alert.trackingNumber}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td><span className="route-tag">{route}</span></td>
                    <td>
                      <span style={{ fontFamily: 'var(--tw-mono)', fontSize: 11, color: 'var(--tw-muted)' }}>
                        {formatTime(alert.createdAt)}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="action-btn resolve-btn" onClick={(e) => handleResolve(e, alert.id)}>
                        Resolve
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

TransitAlertsTable.propTypes = {
  alerts: PropTypes.array,
  shipments: PropTypes.array,
  onResolve: PropTypes.func.isRequired,
  filterRoute: PropTypes.string
};

export default TransitAlertsTable;
