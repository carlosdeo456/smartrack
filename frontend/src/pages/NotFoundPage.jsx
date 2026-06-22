import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-2">Page not found</p>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Button onClick={() => navigate('/')}>
          Go back home
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
