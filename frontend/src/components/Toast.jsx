// Sistema global de notificaciones breves tipo toast.
import React, { useState, useCallback, useEffect } from "react";
import "./Toast.css";

// Cola global simple para mostrar mensajes desde cualquier parte del frontend.
let toastQueue = [];
let toastListeners = [];

export const showToast = (message, type = 'info', duration = 3000) => {
  const id = Date.now();
  const toast = { id, message, type, duration };
  
  toastQueue.push(toast);
  toastListeners.forEach(listener => listener([...toastQueue]));

  if (duration > 0) {
    setTimeout(() => {
      toastQueue = toastQueue.filter(t => t.id !== id);
      toastListeners.forEach(listener => listener([...toastQueue]));
    }, duration);
  }

  return id;
};

export const showSuccess = (message, duration = 3000) => showToast(message, 'success', duration);
export const showError = (message, duration = 4000) => showToast(message, 'error', duration);
export const showInfo = (message, duration = 3000) => showToast(message, 'info', duration);
export const showWarning = (message, duration = 3500) => showToast(message, 'warning', duration);

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter(listener => listener !== setToasts);
    };
  }, []);

  return (
    <div className="toast-container" role="region" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`toast toast-${toast.type}`}
          onClick={() => {
            toastQueue = toastQueue.filter(t => t.id !== toast.id);
            setToasts([...toastQueue]);
          }}
        >
          <div className="toast-icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
            {toast.type === 'warning' && '⚠'}
          </div>
          <span className="toast-message">{toast.message}</span>
          <button 
            className="toast-close" 
            onClick={(e) => {
              e.stopPropagation();
              toastQueue = toastQueue.filter(t => t.id !== toast.id);
              setToasts([...toastQueue]);
            }}
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
