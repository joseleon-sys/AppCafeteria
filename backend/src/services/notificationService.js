// Servicio de notificaciones push y notificaciones internas guardadas en base de datos.
let promesaModuloFirebaseAdmin = null;

async function cargarFirebaseAdmin() {
  // Carga dinamica: solo importamos Firebase si realmente se necesita.
  if (!promesaModuloFirebaseAdmin) {
    promesaModuloFirebaseAdmin = import('firebase-admin').catch((error) => {
      console.warn('Firebase Admin no disponible:', error?.message || String(error));
      return null;
    });
  }

  return promesaModuloFirebaseAdmin;
}

function parsearCuentaServicioDesdeEnv() {
  // Lee las credenciales del servicio desde una variable de entorno en formato JSON.
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    console.warn('FIREBASE_SERVICE_ACCOUNT_JSON no contiene JSON valido');
    return null;
  }
}

async function obtenerMensajeriaFirebase() {
  // Inicializa Firebase Admin una sola vez y devuelve el servicio de mensajeria.
  const admin = await cargarFirebaseAdmin();
  if (!admin) return null;

  if (!admin.apps.length) {
    const cuentaServicio = parsearCuentaServicioDesdeEnv();
    if (!cuentaServicio) {
      console.warn('Firebase Admin desactivado: falta FIREBASE_SERVICE_ACCOUNT_JSON');
      return null;
    }

    admin.initializeApp({
      credential: admin.credential.cert(cuentaServicio),
    });
  }

  return admin.messaging();
}

function obtenerClienteSupabase(client) {
  // Centralizamos esta validacion para no repetirla en cada funcion del servicio.
  if (!client) {
    throw new Error('Supabase no esta configurado para notificaciones');
  }

  return client;
}

export async function registrarTokenDispositivo(supabase, payload = {}) {
  // Guarda o actualiza el token FCM de un dispositivo para poder enviar push despues.
  const client = obtenerClienteSupabase(supabase);
  const {
    idUsuario,
    token,
    platform = 'unknown',
    deviceName = null,
    appVersion = null,
  } = payload;

  if (!idUsuario || !token) {
    throw new Error('idUsuario y token son obligatorios');
  }

  const { data, error } = await client
    .from('user_device_tokens')
    .upsert({
      user_id: idUsuario,
      fcm_token: token,
      platform,
      device_name: deviceName,
      app_version: appVersion,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    }, {
      onConflict: 'fcm_token',
    })
    .select('id, user_id, fcm_token, platform, device_name, app_version, is_active, last_seen_at, created_at')
    .single();

  if (error) throw error;
  return data || null;
}

export async function desactivarTokenDispositivo(supabase, payload = {}) {
  // Marca un token como inactivo, por ejemplo al cerrar sesion o desinstalar.
  const client = obtenerClienteSupabase(supabase);
  const { idUsuario, token } = payload;

  if (!idUsuario || !token) {
    throw new Error('idUsuario y token son obligatorios');
  }

  const { data, error } = await client
    .from('user_device_tokens')
    .update({
      is_active: false,
      last_seen_at: new Date().toISOString(),
    })
    .eq('user_id', idUsuario)
    .eq('fcm_token', token)
    .select('id');

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

export async function guardarNotificacion(supabase, payload = {}) {
  // Ademas del push, la app guarda una copia en base de datos para el historial.
  const client = obtenerClienteSupabase(supabase);
  const { idUsuario, type, title, body, data = {} } = payload;

  if (!idUsuario || !type || !title || !body) {
    throw new Error('idUsuario, type, title y body son obligatorios');
  }

  const { data: notification, error } = await client
    .from('app_notifications')
    .insert({
      user_id: idUsuario,
      type,
      title,
      body,
      data,
      is_read: false,
    })
    .select('id, user_id, type, title, body, data, is_read, created_at, read_at')
    .single();

  if (error) throw error;
  return notification || null;
}

export async function listarNotificacionesUsuario(supabase, idUsuario, limit = 50) {
  // Devuelve las notificaciones mas recientes del usuario.
  const client = obtenerClienteSupabase(supabase);

  const { data, error } = await client
    .from('app_notifications')
    .select('id, user_id, type, title, body, data, is_read, created_at, read_at')
    .eq('user_id', idUsuario)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function marcarNotificacionComoLeida(supabase, idUsuario, idNotificacion) {
  const client = obtenerClienteSupabase(supabase);

  const { data, error } = await client
    .from('app_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', idUsuario)
    .eq('id', idNotificacion)
    .select('id');

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

async function desactivarTokensInvalidos(supabase, tokens = []) {
  const client = obtenerClienteSupabase(supabase);
  if (!tokens.length) return;

  const { error } = await client
    .from('user_device_tokens')
    .update({
      is_active: false,
      last_seen_at: new Date().toISOString(),
    })
    .in('fcm_token', tokens);

  if (error) throw error;
}

export async function enviarPushAUsuario(supabase, payload = {}) {
  const client = obtenerClienteSupabase(supabase);
  const { idUsuario, type, title, body, data = {}, storeInInbox = true } = payload;

  if (!idUsuario || !type || !title || !body) {
    throw new Error('idUsuario, type, title y body son obligatorios');
  }

  const entradaBandeja = storeInInbox
    ? await guardarNotificacion(client, { idUsuario, type, title, body, data })
    : null;

  const { data: filasTokens, error: tokenError } = await client
    .from('user_device_tokens')
    .select('fcm_token')
    .eq('user_id', idUsuario)
    .eq('is_active', true)
    .order('last_seen_at', { ascending: false });

  if (tokenError) throw tokenError;

  const tokens = (filasTokens || []).map((row) => row.fcm_token).filter(Boolean);
  if (!tokens.length) {
    return { delivered: false, reason: 'no_active_tokens', notification: entradaBandeja };
  }

  const messaging = await obtenerMensajeriaFirebase();
  if (!messaging) {
    console.info(`Push omitida para user ${idUsuario}: Firebase Admin no configurado`);
    return { delivered: false, reason: 'firebase_not_configured', notification: entradaBandeja };
  }

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries({
        type,
        ...data,
      }).map(([key, value]) => [key, value == null ? '' : String(value)])
    ),
    android: {
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  });

  const tokensInvalidos = [];
  response.responses.forEach((item, index) => {
    if (!item.success) {
      const code = item.error?.code || '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
        tokensInvalidos.push(tokens[index]);
      }
    }
  });

  if (tokensInvalidos.length) {
    await desactivarTokensInvalidos(client, tokensInvalidos);
  }

  return {
    delivered: response.successCount > 0,
    successCount: response.successCount,
    failureCount: response.failureCount,
    notification: entradaBandeja,
  };
}
