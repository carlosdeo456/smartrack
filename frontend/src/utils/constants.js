export const SHIPMENT_STATUS = {
  PENDING: 'pending',
  IN_TRANSIT: 'in_transit',
  IN_TRANSIT_ALT: 'in-transit',
  DELIVERED: 'delivered',
  DELAYED: 'delayed',
  CANCELLED: 'cancelled'
};

export const STATUS_COLORS = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-900', badge: 'warning' },
  in_transit: { bg: 'bg-blue-100', text: 'text-blue-900', badge: 'primary' },
  'in-transit': { bg: 'bg-blue-100', text: 'text-blue-900', badge: 'primary' },
  delivered: { bg: 'bg-green-100', text: 'text-green-900', badge: 'success' },
  delayed: { bg: 'bg-red-100', text: 'text-red-900', badge: 'danger' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-900', badge: 'default' }
};

export const SENSOR_LIMITS = {
  TEMPERATURE_MIN: 15,
  TEMPERATURE_MAX: 25,
  HUMIDITY_MIN: 30,
  HUMIDITY_MAX: 70,
  PRESSURE_MIN: 950,
  PRESSURE_MAX: 1050
};

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  LOCATION_CHANGE: 'location-change',
  SENSOR_UPDATE: 'sensor-update',
  SHIPMENT_UPDATE: 'shipment-update',
  ALERT: 'alert',
  ALERT_TRIGGERED: 'alert-triggered'
};
