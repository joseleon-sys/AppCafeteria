import React from 'react';
import HamsterSpinner from './HamsterSpinner';
import './HamsterSpinner.css';

const LoadingOverlay = ({ isVisible, message = "Procesando...", size = "medium" }) => {
  if (!isVisible) return null;

  return (
    <div className="loading-overlay">
      <HamsterSpinner message={message} size={size} />
    </div>
  );
};

export default LoadingOverlay;