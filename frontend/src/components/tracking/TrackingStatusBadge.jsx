import React from 'react';
import PropTypes from 'prop-types';

const LABELS = {
  pending: 'Pending',
  dispatched: 'Dispatched',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  failed: 'Exception',
  delayed: 'Delayed',
};

const TrackingStatusBadge = ({ status, live }) => {
  const key = status || 'pending';
  const label = LABELS[key] || key.replace('_', ' ');

  return (
    <span className={`tracking-status-badge tracking-status-badge--${key} ${live && key === 'in_transit' ? 'live' : ''}`}>
      {label}
    </span>
  );
};

TrackingStatusBadge.propTypes = {
  status: PropTypes.string,
  live: PropTypes.bool,
};

export default TrackingStatusBadge;
