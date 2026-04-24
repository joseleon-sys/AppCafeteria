// Hook de estado visual global para controlar ruta actual y modales principales.
import { useEffect, useState } from 'react';

function leerEstadoInicialRuta() {
  // Lee la URL inicial para abrir ciertas vistas automaticamente.
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  return {
    rutaActual: path,
    openCartOnStart: path === '/carrito',
    openHistoryOnStart: path === '/' && params.get('history') === '1',
    idPedidoHistorial: params.get('order_id'),
  };
}

export function useEstadoVistaApp() {
  const rutaInicial = leerEstadoInicialRuta();

  const [mostrarSpinner, setShowSpinner] = useState(false);
  const [mostrarCarrito, setShowCart] = useState(rutaInicial.openCartOnStart);
  const [mostrarHistorial, setShowHistory] = useState(rutaInicial.openHistoryOnStart);
  const [mostrarPerfil, setShowProfile] = useState(false);
  const [mostrarVinculoPadre, setShowLinkParent] = useState(false);
  const [rutaActual] = useState(rutaInicial.rutaActual);
  const [idPedidoHistorial, setHistoryOrderId] = useState(
    rutaInicial.openHistoryOnStart ? rutaInicial.idPedidoHistorial : null,
  );

  useEffect(() => {
    // Limpia la URL despues de abrir ciertas vistas para no repetir el efecto al recargar.
    if (rutaInicial.openCartOnStart) {
      window.history.replaceState({}, '', '/');
    }

    if (rutaActual === '/pago-exitoso') {
      window.history.replaceState({}, '', '/pago-exitoso');
    }

    if (rutaInicial.openHistoryOnStart) {
      window.history.replaceState({}, '', '/');
    }
  }, [rutaActual, rutaInicial.openCartOnStart, rutaInicial.openHistoryOnStart]);

  useEffect(() => {
    // Evita desbordamiento horizontal accidental en la app movil.
    document.body.style.overflowX = 'hidden';
    return () => {
      document.body.style.overflowX = '';
    };
  }, []);

  useEffect(() => {
    // El spinner se apaga solo tras una pequeña espera.
    if (!mostrarSpinner) return undefined;

    const timer = setTimeout(() => {
      setShowSpinner(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [mostrarSpinner]);

  function cerrarHistorial() {
    setShowHistory(false);
    setHistoryOrderId(null);
  }

  return {
    rutaActual,
    idPedidoHistorial,
    mostrarCarrito,
    mostrarHistorial,
    mostrarVinculoPadre,
    mostrarPerfil,
    mostrarSpinner,
    abrirCarrito: () => setShowCart(true),
    cerrarCarrito: () => setShowCart(false),
    abrirHistorial: () => setShowHistory(true),
    cerrarHistorial,
    abrirPerfil: () => setShowProfile(true),
    cerrarPerfil: () => setShowProfile(false),
    abrirVinculoPadre: () => setShowLinkParent(true),
    cerrarVinculoPadre: () => setShowLinkParent(false),
    mostrarSpinnerCarga: () => setShowSpinner(true),
  };
}
