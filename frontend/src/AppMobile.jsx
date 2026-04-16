import React, { useState, useEffect } from "react";
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
import { getCurrentUser } from "./lib/api";
import { bootstrapPushNotifications } from "./lib/pushNotifications";


export default function AppMobile() {
  const [user, setUser] = useState(null); // {role, email}
  const [showSpinner, setShowSpinner] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLinkParent, setShowLinkParent] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [historyOrderId, setHistoryOrderId] = useState(null);

  // Rehidratar sesión desde token al montar el componente
  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      const token = localStorage.getItem('cafeteria_token');
      const savedUser = localStorage.getItem('cafeteria_user');

      if (!token) {
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            if (isMounted) setUser(parsed);
          } catch (error) {
            console.error('Error al cargar sesión local:', error);
            localStorage.removeItem('cafeteria_user');
          }
        }
        return;
      }

      try {
        const response = await getCurrentUser();
        const current = response?.user;

        if (!current) {
          throw new Error('Usuario no disponible');
        }

        const normalizedUser = {
          role: current.role,
          email: current.email,
          name: current.name,
          alias: current.alias || null,
          userId: current.id,
          parentToken: current.parentToken || null,
          isAdult: current.isAdult,
          specialCode: current.specialCode || null,
          created_at: current.created_at || null
        };

        if (isMounted) {
          setUser(normalizedUser);
        }
      } catch (error) {
        console.error('Error al validar sesión con API:', error);
        localStorage.removeItem('cafeteria_token');
        localStorage.removeItem('cafeteria_user');
        if (isMounted) {
          setUser(null);
        }
      }
    };

    hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Guardar sesión cuando cambia el usuario
  useEffect(() => {
    if (user) {
      localStorage.setItem('cafeteria_user', JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    bootstrapPushNotifications().catch((error) => {
      console.error('No se pudieron inicializar las notificaciones push:', error);
    });
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('cafeteria_user');
    localStorage.removeItem('cafeteria_token');
    setUser(null);
  };

  const handleUserUpdate = (updates) => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      return { ...prevUser, ...updates };
    });
  };

  // Bloquear scroll lateral
  React.useEffect(() => {
    document.body.style.overflowX = 'hidden';
    return () => { document.body.style.overflowX = ''; };
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    setCurrentPath(path);

    if (path === '/carrito') {
      setShowCart(true);
      window.history.replaceState({}, '', '/');
    }

    if (path === '/pago-exitoso') {
      window.history.replaceState({}, '', '/pago-exitoso');
    }

    if (path === '/' && params.get('history') === '1') {
      setHistoryOrderId(params.get('order_id'));
      setShowHistory(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    if (!showSpinner) return undefined;

    const spinnerTimeout = setTimeout(() => {
      setShowSpinner(false);
    }, 600);

    return () => clearTimeout(spinnerTimeout);
  }, [showSpinner]);

  return (
    <>
      {/* Solo mostrar Overlay y Toast cuando hay usuario */}
      {user && (
        <>
          <Overlay />
          <Toast />
          <Dialog />
        </>
      )}
      {currentPath === '/pago-exitoso' ? (
        <PagoExitoso />
      ) : !user ? (
        <FancyLogin onLogin={setUser} />
      ) : user.role === "admin" ? (
        <AdminDashboard onLogout={handleLogout} />
      ) : (
        <>
          <MainScreen
            user={user}
            onLogout={handleLogout}
            onShowSpinner={() => setShowSpinner(true)}
            onShowCart={() => setShowCart(true)}
            onShowHistory={() => setShowHistory(true)}
            onShowProfile={() => setShowProfile(true)}
            onShowLinkParent={() => setShowLinkParent(true)}
          />
          {showSpinner && (
            <div className="loading-modal-overlay">
              <div className="loading-modal">
                <HamsterSpinner message="Procesando..." size="large" />
              </div>
            </div>
          )}
          <CartModal 
            isOpen={showCart} 
            onClose={() => setShowCart(false)} 
            user={user}
          />
          <HistoryModal 
            isOpen={showHistory} 
            onClose={() => {
              setShowHistory(false);
              setHistoryOrderId(null);
            }}
            user={user}
            initialOrderId={historyOrderId}
          />
          <ProfileModal 
            isOpen={showProfile} 
            onClose={() => setShowProfile(false)}
            user={user}
            onUserUpdate={handleUserUpdate}
            onLogout={handleLogout}
          />
          <LinkParentModal 
            isOpen={showLinkParent} 
            onClose={() => setShowLinkParent(false)} 
          />
        </>
      )}
    </>
  );
}
