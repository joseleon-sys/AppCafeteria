// Capa visual de carga que bloquea la interfaz mientras se completa una accion.
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
// Capa visual de carga que bloquea la interfaz mientras se completa una accion.
// Capa visual de carga que bloquea la interfaz mientras se completa una accion.
