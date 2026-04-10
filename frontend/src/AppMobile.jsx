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
import { getCurrentUser } from "./lib/api";


export default function AppMobile() {
  const [user, setUser] = useState(null); // {role, email}
  const [showSpinner, setShowSpinner] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLinkParent, setShowLinkParent] = useState(false);

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
      {!user ? (
        <FancyLogin onLogin={setUser} />
      ) : user.role === "admin" ? (
        <AdminDashboard onLogout={handleLogout} />
      ) : (
        <>
          <MainScreen
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
            onClose={() => setShowHistory(false)} 
            user={user}
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
