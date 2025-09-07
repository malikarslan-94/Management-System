// src/components/admin-dashboard/LoaderOverlay.jsx
import React from 'react';
import { Spinner } from '@/components/ui';

const LoaderOverlay = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Spinner size="40px" />
    </div>
  );
};

export default LoaderOverlay;
