import React from 'react';
import PropTypes from 'prop-types';

function buildEvents(shipment) {
  const created = shipment?.created_at
    ? new Date(shipment.created_at).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const status = shipment?.status || 'pending';
  const delivered = status === 'delivered';
  const dispatched = status === 'dispatched';
  const inTransit = status === 'in_transit' || status === 'out_for_delivery' || status === 'delayed' || delivered;
  const outForDelivery = status === 'out_for_delivery';
  const delayed = status === 'delayed';
  const failed = status === 'failed';

  return [
    {
      key: 'created',
      title: 'Shipment created',
      detail: created,
      done: true,
      active: false,
    },
    {
      key: 'dispatched',
      title: 'Dispatched',
      detail: dispatched || inTransit
        ? `Handed over for route to ${shipment?.destination_location || 'destination'}`
        : 'Waiting to be dispatched',
      done: dispatched || inTransit,
      active: dispatched && !inTransit,
    },
    {
      key: 'transit',
      title: failed ? 'Delivery exception' : outForDelivery ? 'Out for delivery' : delayed ? 'Delayed' : 'In transit',
      detail: inTransit
        ? delayed
          ? 'Delivery is delayed while the carrier updates the route'
          : outForDelivery
            ? 'Parcel is on the final delivery run'
            : `En route to ${shipment?.destination_location || 'destination'}`
        : failed
          ? 'Delivery could not be completed'
          : 'Waiting for GPS movement',
      done: inTransit,
      active: status === 'in_transit' || outForDelivery || delayed || failed,
    },
    {
      key: 'delivered',
      title: delivered ? 'Delivered' : 'Delivery',
      detail: delivered
        ? (shipment.actual_delivery
          ? new Date(shipment.actual_delivery).toLocaleString()
          : 'Package delivered')
        : failed
          ? 'Delivery exception recorded'
        : 'Pending delivery',
      done: delivered,
      active: false,
    },
  ];
}

const TrackingTimeline = ({ shipment }) => {
  const events = buildEvents(shipment);

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
        Shipment progress
      </h3>
      <ul className="tracking-timeline">
        {events.map((event) => (
          <li
            key={event.key}
            className={`tracking-timeline-item ${event.done ? 'done' : 'pending'} ${event.active ? 'active' : ''}`}
          >
            <div className="tracking-timeline-marker">
              {event.done ? '✓' : ''}
            </div>
            <div className="tracking-timeline-content">
              <h4>{event.title}</h4>
              <p>{event.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

TrackingTimeline.propTypes = {
  shipment: PropTypes.object,
};

export default TrackingTimeline;
