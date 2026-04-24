// Integracion del frontend con notificaciones push de Capacitor.
import { showInfo } from '../components/Toast';
import { registrarTokenDispositivo } from './api';

function obtenerPluginPush() {
  // Devuelve el plugin si la app corre en entorno con Capacitor.
  return globalThis?.Capacitor?.Plugins?.PushNotifications || null;
}

function obtenerEtiquetaPlataforma() {
  const platform = globalThis?.Capacitor?.getPlatform?.();
  if (platform) return platform;
  return 'web';
}

function guardarTokenRegistrado(token) {
  try {
    localStorage.setItem('cafeteria_push_token', token);
  } catch {
    // ignore storage errors
  }
}

function obtenerTokenGuardadoPush() {
  try {
    return localStorage.getItem('cafeteria_push_token');
  } catch {
    return null;
  }
}

let eventosVinculados = false;

function vincularEventosPush(plugin) {
  // Registra listeners una sola vez para token, errores y notificaciones recibidas.
  if (!plugin || eventosVinculados) return;

  eventosVinculados = true;

  plugin.addListener?.('registration', async (token) => {
    const value = token?.value;
    if (!value) return;

    guardarTokenRegistrado(value);

    try {
      await registrarTokenDispositivo({
        token: value,
        platform: obtenerEtiquetaPlataforma(),
        deviceName: globalThis?.navigator?.userAgent || 'Capacitor device',
        appVersion: import.meta.env.VITE_APP_VERSION || 'dev',
      });
    } catch (error) {
      console.error('No se pudo registrar el token push en backend:', error);
    }
  });

  plugin.addListener?.('registrationError', (error) => {
    console.error('Error registrando push notifications:', error);
  });

  plugin.addListener?.('pushNotificationReceived', (notification) => {
    const title = notification?.title || 'Nueva notificacion';
    const body = notification?.body ? `: ${notification.body}` : '';
    showInfo(`${title}${body}`);
  });

  plugin.addListener?.('pushNotificationActionPerformed', (event) => {
    const data = event?.notification?.data || {};
    if (data?.targetScreen) {
      console.info('Notificacion pulsada. targetScreen:', data.targetScreen, data);
    }
  });
}

export async function inicializarNotificacionesPush() {
  // Pide permisos, registra el dispositivo y devuelve el estado final del flujo.
  const plugin = obtenerPluginPush();
  if (!plugin) {
    return { enabled: false, reason: 'plugin_unavailable' };
  }

  vincularEventosPush(plugin);

  const estadoPermiso = await plugin.requestPermissions?.();
  if (estadoPermiso?.receive !== 'granted') {
    return { enabled: false, reason: 'permission_denied' };
  }

  await plugin.register?.();

  return {
    enabled: true,
    tokenGuardado: obtenerTokenGuardadoPush(),
  };
}
