import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../features';
import { ErrorBoundary, NotificationCenter, useNotification } from '../common';

const MainLayout = () => {
  const { notifications, removeNotification } = useNotification();
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  return (
    <ErrorBoundary>
      <div className="transitwatch-app">
        <Header subtitle={isDashboard ? 'Intercity Parcel Monitoring' : 'Real-time Parcel Tracking'} />
        <main className={isDashboard ? '' : 'app-page-main'}>
          <Outlet />
        </main>
        <NotificationCenter notifications={notifications} onRemove={removeNotification} />
      </div>
    </ErrorBoundary>
  );
};

export default MainLayout;
