import React from 'react';
import PropTypes from 'prop-types';
import { Badge } from '../ui';

const StatusBadge = ({ status }) => {
  const statusMap = {
    'pending': { variant: 'warning', label: 'Pending' },
    'dispatched': { variant: 'info', label: 'Dispatched' },
    'in-transit': { variant: 'info', label: 'In Transit' },
    'in_transit': { variant: 'info', label: 'In Transit' },
    'out_for_delivery': { variant: 'info', label: 'Out for delivery' },
    'delivered': { variant: 'success', label: 'Delivered' },
    'failed': { variant: 'danger', label: 'Exception' },
    'delayed': { variant: 'danger', label: 'Delayed' },
    'cancelled': { variant: 'default', label: 'Cancelled' },
  };

  const config = statusMap[status?.toLowerCase()] || { variant: 'default', label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

export default StatusBadge;
