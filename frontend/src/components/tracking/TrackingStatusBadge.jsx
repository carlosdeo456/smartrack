import React from 'react';
import PropTypes from 'prop-types';

const LABELS = {
  pending: 'Processing',
  in_transit: 'In transit',
  delivered: 'Delivered',
  failed: 'Exception',
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
