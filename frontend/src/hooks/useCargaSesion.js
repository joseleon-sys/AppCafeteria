// Hook que hidrata la sesion del usuario y mantiene su estado sincronizado.
import { useEffect, useState } from 'react';
import { cerrarSesion } from '../lib/api';
import { inicializarNotificacionesPush } from '../lib/pushNotifications';
import { limpiarSesion, cargarUsuarioSesion, guardarUsuario } from '../lib/sesion';

export function useCargaSesion() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Al montar, intenta recuperar la sesion previa del navegador o de la API.
    let sigueMontado = true;

    async function hidratarSesion() {
      try {
        const usuarioCargado = await cargarUsuarioSesion();
        if (sigueMontado) {
          setUser(usuarioCargado);
        }
      } catch (error) {
        console.error('Error al cargar la sesión:', error);
        limpiarSesion();
        if (sigueMontado) {
          setUser(null);
        }
      }
    }

    hidratarSesion();

    return () => {
      sigueMontado = false;
    };
  }, []);

  useEffect(() => {
    // Cada cambio de usuario se persiste localmente.
    if (!user) return;
    guardarUsuario(user);
  }, [user]);

  useEffect(() => {
    // Con sesion activa, intenta registrar push notifications.
    if (!user) return;

    inicializarNotificacionesPush().catch((error) => {
      console.error('No se pudieron inicializar las notificaciones push:', error);
    });
  }, [user]);

  async function logout() {
    try {
      await cerrarSesion();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
    limpiarSesion();
    setUser(null);
  }

  function actualizarUsuario(cambios) {
    setUser((usuarioActual) => {
      if (!usuarioActual) return usuarioActual;
      return { ...usuarioActual, ...cambios };
    });
  }

  return {
    user,
    setUser,
    logout,
    actualizarUsuario,
  };
}
