// Componente raiz de la interfaz: decide que pantalla o modal debe verse.
import React, { Suspense, lazy } from "react";
import HamsterSpinner from "./components/HamsterSpinner";
import Overlay from "./components/Overlay";
import Toast from "./components/Toast";
import Dialog from "./components/Dialog";
import { useCargaSesion } from "./hooks/useCargaSesion";
import { useEstadoVistaApp } from "./hooks/useEstadoVistaApp";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CartModal = lazy(() => import("./components/CartModal"));
const FancyLogin = lazy(() => import("./components/FancyLogin"));
const HistoryModal = lazy(() => import("./components/HistoryModal"));
const LinkParentModal = lazy(() => import("./components/LinkParentModal"));
const MainScreen = lazy(() => import("./components/MainScreen"));
const PagoExitoso = lazy(() => import("./pages/PagoExitoso"));
const ProfileModal = lazy(() => import("./components/ProfileModal"));

function LazyBoundary({ children, fallback = null }) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

export default function AppMovil() {
  // Hook de sesion: sabe quien es el usuario y como cerrar sesion.
  const { user, setUser, logout, actualizarUsuario } = useCargaSesion();
  // Hook visual: centraliza el estado de la pantalla actual y de los modales.
  const {
    rutaActual,
    idPedidoHistorial,
    mostrarCarrito,
    mostrarHistorial,
    mostrarVinculoPadre,
    mostrarPerfil,
    mostrarSpinner,
    abrirCarrito,
    cerrarCarrito,
    abrirHistorial,
    cerrarHistorial,
    abrirPerfil,
    cerrarPerfil,
    abrirVinculoPadre,
    cerrarVinculoPadre,
    mostrarSpinnerCarga,
  } = useEstadoVistaApp();

  const esPaginaExito = rutaActual === '/pago-exitoso';
  const haIniciadoSesion = Boolean(user);
  const esAdmin = user?.role === "admin";

  return (
    <>
      {/* Estos componentes globales solo se montan cuando ya hay sesion iniciada. */}
      {haIniciadoSesion && (
        <>
          <Overlay />
          <Toast />
          <Dialog />
        </>
      )}

      {esPaginaExito ? (
        // Tras un pago correcto se muestra una pantalla especifica.
        <LazyBoundary>
          <PagoExitoso />
        </LazyBoundary>
      ) : !haIniciadoSesion ? (
        // Si no hay usuario, la app muestra el login.
        <LazyBoundary>
          <FancyLogin onLogin={setUser} />
        </LazyBoundary>
      ) : esAdmin ? (
        // Los administradores van a su panel propio.
        <LazyBoundary fallback={<div className="loading">Cargando panel...</div>}>
          <AdminDashboard onLogout={logout} />
        </LazyBoundary>
      ) : (
        <>
          {/* Flujo normal del usuario cliente o hijo. */}
          <LazyBoundary>
            <MainScreen
              user={user}
              onLogout={logout}
              onShowSpinner={mostrarSpinnerCarga}
              onShowCart={abrirCarrito}
              onShowHistory={abrirHistorial}
              onShowProfile={abrirPerfil}
              onShowLinkParent={abrirVinculoPadre}
            />
          </LazyBoundary>
          {mostrarSpinner && (
            <div className="loading-modal-overlay">
              <div className="loading-modal">
                <HamsterSpinner message="Procesando..." size="large" />
              </div>
            </div>
          )}
          {/* Modales secundarios controlados por el hook de estado visual. */}
          {mostrarCarrito && (
            <LazyBoundary>
              <CartModal
                isOpen={mostrarCarrito}
                onClose={cerrarCarrito}
                user={user}
              />
            </LazyBoundary>
          )}
          {mostrarHistorial && (
            <LazyBoundary>
              <HistoryModal
                isOpen={mostrarHistorial}
                onClose={cerrarHistorial}
                user={user}
                initialOrderId={idPedidoHistorial}
              />
            </LazyBoundary>
          )}
          {mostrarPerfil && (
            <LazyBoundary>
              <ProfileModal
                isOpen={mostrarPerfil}
                onClose={cerrarPerfil}
                user={user}
                onUserUpdate={actualizarUsuario}
                onLogout={logout}
              />
            </LazyBoundary>
          )}
          {mostrarVinculoPadre && (
            <LazyBoundary>
              <LinkParentModal
                isOpen={mostrarVinculoPadre}
                onClose={cerrarVinculoPadre}
              />
            </LazyBoundary>
          )}
        </>
      )}
    </>
  );
}
