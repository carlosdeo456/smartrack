import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LiveFleetMap } from '../components/features';
import { useLiveTracking } from '../hooks/useLiveTracking';
import { BreadcrumbNav } from '../components/common';
import { Button } from '../components/ui';

import { API_URL } from '../utils/apiConfig';

const LiveMapPage = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveLocation, setLiveLocation] = useState(null);

  const { connected } = useLiveTracking({
    onLocationChange: (data) => {
      setLiveLocation(data);
      setShipments(prev =>
        prev.map(s =>
          s.id === data.shipmentId
            ? { ...s, currentLocation: data }
            : s
        )
      );
    }
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/shipments`);
        if (res.ok) {
          setShipments(await res.json());
        }
      } catch (err) {
        console.error('Failed to load shipments:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <>
      <BreadcrumbNav custom={[{ label: 'Live Map', path: '/map' }]} />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--tw-text)]">Live Map</h1>
            <p className="text-[var(--tw-muted)] mt-1">
              Real-time parcel locations across all active shipments
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/track">
              <Button variant="outline">Track by number</Button>
            </Link>
            <Link to="/">
              <Button>Dashboard</Button>
            </Link>
          </div>
        </div>

        <LiveFleetMap
          shipments={shipments}
          liveLocation={liveLocation}
          connected={connected}
          isLoading={loading}
        />
      </div>
    </>
  );
};

export default LiveMapPage;
