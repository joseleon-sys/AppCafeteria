// Componente raiz de la interfaz: decide que pantalla o modal debe verse.
import React from "react";
import HamsterSpinner from "./components/HamsterSpinner";
import Overlay from "./components/Overlay";
import Toast from "./components/Toast";
import FancyLogin from "./components/FancyLogin";
import MainScreen from "./components/MainScreen";
import AdminDashboard from "./pages/AdminDashboard";
import CartModal from "./components/CartModal";
import HistoryModal from "./components/HistoryModal";
import ProfileModal from "./components/ProfileModal";
import LinkParentModal from "./components/LinkParentModal";
import Dialog from "./components/Dialog";
import PagoExitoso from "./pages/PagoExitoso";
import { useCargaSesion } from "./hooks/useCargaSesion";
import { useEstadoVistaApp } from "./hooks/useEstadoVistaApp";

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
        <PagoExitoso />
      ) : !haIniciadoSesion ? (
        // Si no hay usuario, la app muestra el login.
        <FancyLogin onLogin={setUser} />
      ) : esAdmin ? (
        // Los administradores van a su panel propio.
        <AdminDashboard onLogout={logout} />
      ) : (
        <>
          {/* Flujo normal del usuario cliente o hijo. */}
          <MainScreen
            user={user}
            onLogout={logout}
            onShowSpinner={mostrarSpinnerCarga}
            onShowCart={abrirCarrito}
            onShowHistory={abrirHistorial}
            onShowProfile={abrirPerfil}
            onShowLinkParent={abrirVinculoPadre}
          />
          {mostrarSpinner && (
            <div className="loading-modal-overlay">
              <div className="loading-modal">
                <HamsterSpinner message="Procesando..." size="large" />
              </div>
            </div>
          )}
          {/* Modales secundarios controlados por el hook de estado visual. */}
          <CartModal 
            isOpen={mostrarCarrito} 
            onClose={cerrarCarrito} 
            user={user}
          />
          <HistoryModal 
            isOpen={mostrarHistorial} 
            onClose={cerrarHistorial}
            user={user}
            initialOrderId={idPedidoHistorial}
          />
          <ProfileModal 
            isOpen={mostrarPerfil} 
            onClose={cerrarPerfil}
            user={user}
            onUserUpdate={actualizarUsuario}
            onLogout={logout}
          />
          <LinkParentModal 
            isOpen={mostrarVinculoPadre} 
            onClose={cerrarVinculoPadre} 
          />
        </>
      )}
    </>
  );
}
