import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer } from '../components/features';
import TrackingSidebar from '../components/tracking/TrackingSidebar';
import { SensorMonitor } from '../components/features';
import { useNotification } from '../components/common';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useLiveTracking } from '../hooks/useLiveTracking';

const TrackingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotification();
  const shipmentRef = useRef(null);

  const { liveLocation, connected } = useLiveTracking({
    onLocationChange: (data) => {
      if (shipmentRef.current?.id === data.shipmentId) {
        setShipment(prev => ({ ...prev, currentLocation: data }));
      }
    }
  });

  useEffect(() => {
    shipmentRef.current = shipment;
  }, [shipment]);

  useEffect(() => {
    fetchShipmentDetail();
  }, [id]);

  const fetchSensorData = async (shipmentId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/shipments/${shipmentId}/sensors`
      );
      if (response.ok) {
        setSensorData(await response.json());
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
    }
  };

  const fetchShipmentDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/shipments/${id}`
      );
      if (response.ok) {
        const data = await response.json();
        setShipment(data);
        await fetchSensorData(id);
        addNotification(`Loaded ${data.tracking_number}`, 'success');
      } else if (response.status === 404) {
        addNotification('Shipment not found', 'error');
        navigate('/');
      } else {
        throw new Error('Failed to fetch shipment details');
      }
    } catch (error) {
      addNotification(error.message || 'Error loading shipment', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="tracking-portal flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!shipment) return null;

  const displayShipment = { ...shipment, currentLocation: liveLocation || shipment.currentLocation };

  return (
    <div className="tracking-portal tracking-portal--embedded">
      <div className="tracking-live-layout" style={{ minHeight: 'calc(100vh - 140px)' }}>
        <TrackingSidebar shipment={displayShipment} connected={connected} />
        <div className="tracking-live-map">
          <MapContainer
            selectedShipment={displayShipment}
            liveLocation={liveLocation}
            connected={connected}
            showTrackingSheet
          />
        </div>
      </div>

      {sensorData && (
        <div className="max-w-4xl mx-auto p-6">
          <SensorMonitor sensorData={sensorData} />
        </div>
      )}
    </div>
  );
};

export default TrackingDetailPage;
