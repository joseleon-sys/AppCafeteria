import { showInfo } from '../components/Toast';
import { registerDeviceToken } from './api';

function getPushPlugin() {
  return globalThis?.Capacitor?.Plugins?.PushNotifications || null;
}

function getPlatformLabel() {
  const platform = globalThis?.Capacitor?.getPlatform?.();
  if (platform) return platform;
  return 'web';
}

function cacheRegisteredToken(token) {
  try {
    localStorage.setItem('cafeteria_push_token', token);
  } catch {
    // ignore storage errors
  }
}

function getCachedToken() {
  try {
    return localStorage.getItem('cafeteria_push_token');
  } catch {
    return null;
  }
}

let listenersBound = false;

function bindPushListeners(plugin) {
  if (!plugin || listenersBound) return;

  listenersBound = true;

  plugin.addListener?.('registration', async (token) => {
    const value = token?.value;
    if (!value) return;

    cacheRegisteredToken(value);

    try {
      await registerDeviceToken({
        token: value,
        platform: getPlatformLabel(),
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

export async function bootstrapPushNotifications() {
  const plugin = getPushPlugin();
  if (!plugin) {
    return { enabled: false, reason: 'plugin_unavailable' };
  }

  bindPushListeners(plugin);

  const permissionStatus = await plugin.requestPermissions?.();
  if (permissionStatus?.receive !== 'granted') {
    return { enabled: false, reason: 'permission_denied' };
  }

  await plugin.register?.();

  return {
    enabled: true,
    cachedToken: getCachedToken(),
  };
}
