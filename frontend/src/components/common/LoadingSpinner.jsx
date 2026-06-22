import React from 'react';
import { Spinner } from '../ui';

const LoadingSpinner = ({ fullPage = false, message = 'Loading...' }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" color="blue" />
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-96">
      {content}
    </div>
  );
};

export default LoadingSpinner;
