import React from 'react';
import PropTypes from 'prop-types';
import TrackingStatusBadge from './TrackingStatusBadge';
import TrackingTimeline from './TrackingTimeline';

function estimateEta(shipment) {
  if (shipment?.status === 'delivered') return 'Delivered';
  if (shipment?.expected_delivery) {
    const mins = Math.round((new Date(shipment.expected_delivery) - Date.now()) / 60000);
    if (mins <= 0) return 'Arriving soon';
    if (mins < 60) return `Arriving in ~${mins} min`;
    const hours = Math.floor(mins / 60);
    return `Arriving in ~${hours}h ${mins % 60}m`;
  }
  if (shipment?.status === 'in_transit') return 'On the way';
  return 'Preparing shipment';
}

const TrackingSidebar = ({ shipment, connected }) => {
  const isLive = shipment?.status === 'in_transit';

  return (
    <div className="tracking-live-sidebar">
      <div className="tracking-id-display">{shipment.tracking_number}</div>

      <TrackingStatusBadge status={shipment.status} live={isLive && connected} />

      <div className="tracking-eta-block">
        <h2>{estimateEta(shipment)}</h2>
        <p>
          {isLive && connected ? 'Live GPS tracking active' : isLive ? 'Reconnecting to live updates…' : 'Shipment updates'}
        </p>
      </div>

      <div className="tracking-route-card">
        <div className="tracking-route-row">
          <div className="tracking-route-dot tracking-route-dot--from" />
          <div>
            <div className="tracking-route-label">From</div>
            <div className="tracking-route-value">{shipment.origin_location}</div>
          </div>
        </div>
        <div className="tracking-route-row">
          <div className="tracking-route-dot tracking-route-dot--to" />
          <div>
            <div className="tracking-route-label">To</div>
            <div className="tracking-route-value">{shipment.destination_location}</div>
          </div>
        </div>
      </div>

      {(shipment.sender_name || shipment.recipient_name) && (
        <div className="tracking-party-grid">
          <div className="tracking-party">
            <div className="tracking-party-label">Sender</div>
            <div className="tracking-party-name">{shipment.sender_name || '—'}</div>
            {shipment.sender_phone && (
              <div className="tracking-party-phone">{shipment.sender_phone}</div>
            )}
          </div>
          <div className="tracking-party">
            <div className="tracking-party-label">Receiver</div>
            <div className="tracking-party-name">{shipment.recipient_name || '—'}</div>
            {shipment.recipient_phone && (
              <div className="tracking-party-phone">{shipment.recipient_phone}</div>
            )}
          </div>
        </div>
      )}

      <TrackingTimeline shipment={shipment} />

      {shipment.contents && (
        <p className="text-sm text-gray-500 mt-4">
          Contents: <span className="font-medium text-gray-800">{shipment.contents}</span>
          {shipment.weight != null && ` · ${shipment.weight} kg`}
        </p>
      )}
    </div>
  );
};

TrackingSidebar.propTypes = {
  shipment: PropTypes.object.isRequired,
  connected: PropTypes.bool,
};

export default TrackingSidebar;
