import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '../ui';
import StatusBadge from './StatusBadge';

const DetailsPanel = ({ shipment }) => {
  if (!shipment) {
    return (
      <Card className="p-8 text-center text-gray-500">
        <p>Select a shipment to view details</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-2xl font-bold mb-4 text-gray-900">📦 {shipment.tracking_number}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-gray-600 text-sm">From</p>
          <p className="font-semibold text-gray-900">{shipment.origin_location || 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">To</p>
          <p className="font-semibold text-gray-900">{shipment.destination_location || 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Status</p>
          <div className="mt-1">
            <StatusBadge status={shipment.status} />
          </div>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Expected Delivery</p>
          <p className="font-semibold text-gray-900">
            {shipment.expected_delivery ? new Date(shipment.expected_delivery).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      {shipment.status === 'in_transit' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800 text-sm">Live on map</p>
            <p className="text-xs text-green-700">
              Parcel is moving toward {shipment.destination_location}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <p className="text-gray-600 text-sm">Weight</p>
          <p className="font-semibold">{shipment.weight || 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Dimensions</p>
          <p className="font-semibold">{shipment.dimensions || 'N/A'}</p>
        </div>
      </div>
    </Card>
  );
};

DetailsPanel.propTypes = {
  shipment: PropTypes.object,
};

export default DetailsPanel;
