let firebaseAdminModulePromise = null;

async function loadFirebaseAdmin() {
  if (!firebaseAdminModulePromise) {
    firebaseAdminModulePromise = import('firebase-admin').catch((error) => {
      console.warn('Firebase Admin no disponible:', error?.message || String(error));
      return null;
    });
  }

  return firebaseAdminModulePromise;
}

function parseServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    console.warn('FIREBASE_SERVICE_ACCOUNT_JSON no contiene JSON valido');
    return null;
  }
}

async function getFirebaseMessaging() {
  const admin = await loadFirebaseAdmin();
  if (!admin) return null;

  if (!admin.apps.length) {
    const serviceAccount = parseServiceAccountFromEnv();
    if (!serviceAccount) {
      console.warn('Firebase Admin desactivado: falta FIREBASE_SERVICE_ACCOUNT_JSON');
      return null;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return admin.messaging();
}

function getSupabaseClient(client) {
  if (!client) {
    throw new Error('Supabase no esta configurado para notificaciones');
  }

  return client;
}

export async function registerDeviceToken(supabase, payload = {}) {
  const client = getSupabaseClient(supabase);
  const {
    userId,
    token,
    platform = 'unknown',
    deviceName = null,
    appVersion = null,
  } = payload;

  if (!userId || !token) {
    throw new Error('userId y token son obligatorios');
  }

  const { data, error } = await client
    .from('user_device_tokens')
    .upsert({
      user_id: userId,
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

export async function deactivateDeviceToken(supabase, payload = {}) {
  const client = getSupabaseClient(supabase);
  const { userId, token } = payload;

  if (!userId || !token) {
    throw new Error('userId y token son obligatorios');
  }

  const { data, error } = await client
    .from('user_device_tokens')
    .update({
      is_active: false,
      last_seen_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('fcm_token', token)
    .select('id');

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

export async function storeNotification(supabase, payload = {}) {
  const client = getSupabaseClient(supabase);
  const { userId, type, title, body, data = {} } = payload;

  if (!userId || !type || !title || !body) {
    throw new Error('userId, type, title y body son obligatorios');
  }

  const { data: notification, error } = await client
    .from('app_notifications')
    .insert({
      user_id: userId,
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

export async function listUserNotifications(supabase, userId, limit = 50) {
  const client = getSupabaseClient(supabase);

  const { data, error } = await client
    .from('app_notifications')
    .select('id, user_id, type, title, body, data, is_read, created_at, read_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function markNotificationAsRead(supabase, userId, notificationId) {
  const client = getSupabaseClient(supabase);

  const { data, error } = await client
    .from('app_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', notificationId)
    .select('id');

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

async function deactivateInvalidTokens(supabase, tokens = []) {
  const client = getSupabaseClient(supabase);
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

export async function sendPushToUser(supabase, payload = {}) {
  const client = getSupabaseClient(supabase);
  const { userId, type, title, body, data = {}, storeInInbox = true } = payload;

  if (!userId || !type || !title || !body) {
    throw new Error('userId, type, title y body son obligatorios');
  }

  const inboxEntry = storeInInbox
    ? await storeNotification(client, { userId, type, title, body, data })
    : null;

  const { data: tokenRows, error: tokenError } = await client
    .from('user_device_tokens')
    .select('fcm_token')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_seen_at', { ascending: false });

  if (tokenError) throw tokenError;

  const tokens = (tokenRows || []).map((row) => row.fcm_token).filter(Boolean);
  if (!tokens.length) {
    return { delivered: false, reason: 'no_active_tokens', notification: inboxEntry };
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    console.info(`Push omitida para user ${userId}: Firebase Admin no configurado`);
    return { delivered: false, reason: 'firebase_not_configured', notification: inboxEntry };
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

  const invalidTokens = [];
  response.responses.forEach((item, index) => {
    if (!item.success) {
      const code = item.error?.code || '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
        invalidTokens.push(tokens[index]);
      }
    }
  });

  if (invalidTokens.length) {
    await deactivateInvalidTokens(client, invalidTokens);
  }

  return {
    delivered: response.successCount > 0,
    successCount: response.successCount,
    failureCount: response.failureCount,
    notification: inboxEntry,
  };
}
