import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '../ui';
import { SENSOR_LIMITS } from '../../utils/constants';

function getTempStatus(value) {
  if (value == null) return { label: 'No data', alert: false };
  if (value > SENSOR_LIMITS.TEMPERATURE_MAX) return { label: 'Too high', alert: true };
  if (value < SENSOR_LIMITS.TEMPERATURE_MIN) return { label: 'Too low', alert: true };
  return { label: 'Within range', alert: false };
}

function getHumidityStatus(value) {
  if (value == null) return { label: 'No data', alert: false };
  if (value > SENSOR_LIMITS.HUMIDITY_MAX) return { label: 'Too high', alert: true };
  if (value < SENSOR_LIMITS.HUMIDITY_MIN) return { label: 'Too low', alert: true };
  return { label: 'Optimal', alert: false };
}

const SensorMonitor = ({ sensorData }) => {
  if (!sensorData) {
    return (
      <Card>
        <h4 className="text-lg font-bold mb-2 text-gray-900">🌡️ Environmental Monitoring</h4>
        <p className="text-gray-500 text-sm">No sensor data available</p>
      </Card>
    );
  }

  const tempStatus = getTempStatus(sensorData.temperature);
  const humidityStatus = getHumidityStatus(sensorData.humidity);

  return (
    <Card>
      <h4 className="text-lg font-bold mb-4 text-gray-900">🌡️ Environmental Monitoring</h4>
      <p className="text-xs text-gray-500 mb-3">
        Safe range: {SENSOR_LIMITS.TEMPERATURE_MIN}–{SENSOR_LIMITS.TEMPERATURE_MAX}°C, {SENSOR_LIMITS.HUMIDITY_MIN}–{SENSOR_LIMITS.HUMIDITY_MAX}% humidity
      </p>
      <div className="grid grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${tempStatus.alert ? 'bg-red-50 border-red-300' : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'}`}>
          <p className="text-gray-600 text-sm">Temperature</p>
          <p className={`text-3xl font-bold ${tempStatus.alert ? 'text-red-600' : 'text-blue-600'}`}>
            {sensorData.temperature ?? '—'}°C
          </p>
          <p className={`text-xs mt-1 ${tempStatus.alert ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
            {tempStatus.label}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${humidityStatus.alert ? 'bg-red-50 border-red-300' : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'}`}>
          <p className="text-gray-600 text-sm">Humidity</p>
          <p className={`text-3xl font-bold ${humidityStatus.alert ? 'text-red-600' : 'text-green-600'}`}>
            {sensorData.humidity ?? '—'}%
          </p>
          <p className={`text-xs mt-1 ${humidityStatus.alert ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
            {humidityStatus.label}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <p className="text-gray-600 text-sm">Pressure</p>
          <p className="text-3xl font-bold text-purple-600">{sensorData.pressure} hPa</p>
          <p className="text-xs text-gray-500 mt-1">Normal</p>
        </div>
      </div>
    </Card>
  );
};

SensorMonitor.propTypes = {
  sensorData: PropTypes.object,
};

export default SensorMonitor;
