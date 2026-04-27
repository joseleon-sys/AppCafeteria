// Capa central de acceso a la API del backend.
const URL_API_POR_DEFECTO = 'http://localhost:3000';

function normalizarUrlApi(url) {
  // Quita espacios y barras finales para construir URLs estables.
  return String(url || '').trim().replace(/\/+$/, '');
}

function urlsUnicas(urls) {
  // Elimina URLs vacias o repetidas.
  return urls.filter((url, index) => url && urls.indexOf(url) === index);
}

const URL_API = normalizarUrlApi(import.meta.env.VITE_API_URL || import.meta.env.BACKEND_URL || URL_API_POR_DEFECTO);
const URL_API_RESPALDO = normalizarUrlApi(import.meta.env.VITE_API_FALLBACK_URL || import.meta.env.VITE_RAILWAY_API_URL);
const URLS_API = urlsUnicas([URL_API, URL_API_RESPALDO]);
const ACCESS_TOKEN_KEY = 'cafeteria_token';
const REFRESH_TOKEN_KEY = 'cafeteria_refresh_token';

function obtenerTokenAuth() {
  // Recupera el JWT guardado en el navegador.
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function obtenerRefreshTokenAuth() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function guardarTokensAuth(payload = {}) {
  const accessToken = payload.accessToken || payload.token;
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (payload.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
}

export function limpiarTokensAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function obtenerCabecerasAuth(includeContentType = false) {
  // Construye las cabeceras HTTP necesarias para peticiones autenticadas.
  const token = obtenerTokenAuth();
  const headers = {};

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function gestionarRespuesta(response) {
  // Convierte la respuesta a JSON y lanza error si el backend respondio mal.
  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return payload;
}

async function refrescarAccessToken(baseUrl) {
  const refreshToken = obtenerRefreshTokenAuth();
  if (!refreshToken) return null;

  const response = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    limpiarTokensAuth();
    return null;
  }

  const payload = await response.json().catch(() => null);
  guardarTokensAuth(payload || {});
  return payload?.accessToken || payload?.token || null;
}

async function peticionApi(path, options = {}, { auth = false, contentType = false } = {}) {
  // Funcion base reutilizada por el resto de llamadas a la API.
  const headers = {
    ...(auth ? obtenerCabecerasAuth(contentType) : (contentType ? { 'Content-Type': 'application/json' } : {})),
    ...(options.headers || {}),
  };

  let lastNetworkError;

  for (const baseUrl of URLS_API) {
    // Intenta primero la URL principal y luego la de respaldo si existe.
    let response;

    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw error;
      }

      lastNetworkError = error;
      continue;
    }

    if (auth && (response.status === 401 || response.status === 403)) {
      const nuevoAccessToken = await refrescarAccessToken(baseUrl);
      if (nuevoAccessToken) {
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${nuevoAccessToken}`,
        };

        const retryResponse = await fetch(`${baseUrl}${path}`, {
          ...options,
          headers: retryHeaders,
        });

        return gestionarRespuesta(retryResponse);
      }
    }

    return gestionarRespuesta(response);
  }

  throw lastNetworkError || new Error('No API URL configured');
}

export { URL_API, URL_API_RESPALDO, URLS_API, obtenerTokenAuth, obtenerCabecerasAuth, gestionarRespuesta, peticionApi };

export async function iniciarSesion(credenciales) {
  // Login de usuario.
  return peticionApi('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credenciales),
  }, { contentType: true });
}

export async function registrarUsuario(datosUsuario) {
  // Registro de usuario nuevo.
  return peticionApi('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(datosUsuario),
  }, { contentType: true });
}

export async function restablecerContrasena(payload) {
  // Flujo de recuperacion de acceso.
  return peticionApi('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { contentType: true });
}

export async function cerrarSesion(refreshToken = obtenerRefreshTokenAuth()) {
  return peticionApi('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }, { contentType: true });
}

export async function obtenerTodosLosProductos() {
  return peticionApi('/api/products', {}, { auth: true });
}

export async function obtenerProductosActivos() {
  return peticionApi('/api/menu');
}

export async function crearProducto(datosProducto) {
  return peticionApi('/api/products', {
    method: 'POST',
    body: JSON.stringify(datosProducto),
  }, { auth: true, contentType: true });
}

export async function actualizarProducto(id, datosProducto) {
  return peticionApi(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datosProducto),
  }, { auth: true, contentType: true });
}

export async function eliminarProducto(id, permanent = false) {
  const suffix = permanent ? '?permanent=true' : '';
  return peticionApi(`/api/products/${id}${suffix}`, {
    method: 'DELETE',
  }, { auth: true });
}

export async function crearPedido(datosPedido) {
  return peticionApi('/api/orders', {
    method: 'POST',
    body: JSON.stringify(datosPedido),
  }, { auth: true, contentType: true });
}

export async function crearSesionDePago(items = []) {
  return peticionApi('/api/stripe/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ items }),
  }, { auth: true, contentType: true });
}

export async function obtenerPedido(id) {
  return peticionApi(`/api/orders/${id}`, {}, { auth: true });
}

export async function obtenerMisPedidos(status = null, limit = 50) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (limit) params.append('limit', String(limit));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return peticionApi(`/api/orders/my${suffix}`, {}, { auth: true });
}

export async function verificarSalud() {
  return peticionApi('/api/health');
}

export async function actualizarPerfil(alias, specialCode = undefined) {
  return peticionApi('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ alias, ...(specialCode !== undefined ? { specialCode } : {}) }),
  }, { auth: true, contentType: true });
}

export async function actualizarAliasPerfil(alias) {
  return actualizarPerfil(alias);
}

export async function obtenerUsuarioActual() {
  return peticionApi('/api/auth/me', {}, { auth: true });
}

export async function obtenerMisFavoritos() {
  return peticionApi('/api/auth/favorites', {}, { auth: true });
}

export async function actualizarMisFavoritos(idsFavoritos) {
  return peticionApi('/api/auth/favorites', {
    method: 'PUT',
    body: JSON.stringify({ favoriteIds: idsFavoritos }),
  }, { auth: true, contentType: true });
}

export async function solicitarVinculoPadre(tokenPadre) {
  return peticionApi('/api/child/link-parent', {
    method: 'POST',
    body: JSON.stringify({ parentToken: tokenPadre }),
  }, { auth: true, contentType: true });
}

export async function obtenerSolicitudesVinculoPadre() {
  return peticionApi('/api/parent/link-requests', {}, { auth: true });
}

export async function aprobarSolicitudVinculoPadre(idSolicitud, limiteGasto = 20) {
  return peticionApi(`/api/parent/link-requests/${idSolicitud}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ spendingLimit: limiteGasto }),
  }, { auth: true, contentType: true });
}

export async function rechazarSolicitudVinculoPadre(idSolicitud, reason) {
  return peticionApi(`/api/parent/link-requests/${idSolicitud}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  }, { auth: true, contentType: true });
}

export async function obtenerMisVinculosPadre() {
  return peticionApi('/api/child/my-parents', {}, { auth: true });
}

export async function obtenerMisVinculosHijos() {
  return peticionApi('/api/parent/my-children', {}, { auth: true });
}

export async function crearPedidoHijo(items, notes = '', parentId = null) {
  return peticionApi('/api/child/orders', {
    method: 'POST',
    body: JSON.stringify({ items, notes, parent_id: parentId }),
  }, { auth: true, contentType: true });
}

export async function obtenerMisPedidosHijo(status = null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return peticionApi(`/api/child/orders${query}`, {}, { auth: true });
}

export async function obtenerDetalleMiPedidoHijo(idPedido) {
  return peticionApi(`/api/child/orders/${idPedido}`, {}, { auth: true });
}

export async function obtenerPedidosPadreHijo(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.child_id) params.append('child_id', filters.child_id);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return peticionApi(`/api/parent/child-orders${suffix}`, {}, { auth: true });
}

export async function obtenerDetallePedidoPadre(idPedido) {
  return peticionApi(`/api/parent/orders/${idPedido}`, {}, { auth: true });
}

export async function aprobarPedidoHijo(idPedido, approvedAmount = null) {
  return peticionApi(`/api/parent/orders/${idPedido}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ approved_amount: approvedAmount }),
  }, { auth: true, contentType: true });
}

export async function rechazarPedidoHijo(idPedido, reason) {
  return peticionApi(`/api/parent/orders/${idPedido}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  }, { auth: true, contentType: true });
}

export async function modificarPedidoHijo(idPedido, items) {
  return peticionApi(`/api/parent/orders/${idPedido}/modify`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  }, { auth: true, contentType: true });
}

export async function marcarPedidoComoPagado(idPedido, metodoPago = 'cash', montoPagado = null) {
  return peticionApi(`/api/parent/orders/${idPedido}/pay`, {
    method: 'PUT',
    body: JSON.stringify({ payment_method: metodoPago, amount_paid: montoPagado }),
  }, { auth: true, contentType: true });
}

export async function obtenerPedidoHistory(filters = {}) {
  const params = new URLSearchParams();
  if (filters.child_id) params.append('child_id', filters.child_id);
  if (filters.status) params.append('status', filters.status);
  if (filters.from_date) params.append('from_date', filters.from_date);
  if (filters.to_date) params.append('to_date', filters.to_date);
  if (filters.limit) params.append('limit', String(filters.limit));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return peticionApi(`/api/parent/child-orders/history${suffix}`, {}, { auth: true });
}

export async function obtenerEstadisticasAdmin() {
  return peticionApi('/api/admin/statistics', {}, { auth: true });
}

export async function registrarTokenDispositivo(payload) {
  return peticionApi('/api/notifications/devices', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { auth: true, contentType: true });
}

export async function unregistrarTokenDispositivo(token) {
  return peticionApi(`/api/notifications/devices/${encodeURIComponent(token)}`, {
    method: 'DELETE',
  }, { auth: true });
}

export async function obtenerMisNotificaciones(limit = 50) {
  const params = new URLSearchParams();
  if (limit) params.append('limit', String(limit));
  const suffix = params.toString() ? `?${params.toString()}` : '';

  return peticionApi(`/api/notifications${suffix}`, {}, { auth: true });
}

export async function marcarNotificacionComoLeida(idNotificacion) {
  return peticionApi(`/api/notifications/${idNotificacion}/read`, {
    method: 'PUT',
  }, { auth: true });
}

export async function obtenerColaPedidosAdmin() {
  return peticionApi('/api/admin/orders/queue', {}, { auth: true });
}

export async function obtenerRegistroFraude() {
  return peticionApi('/api/admin/fraud-log', {}, { auth: true });
}

export async function obtenerTodosLosUsuarios() {
  return peticionApi('/api/admin/users', {}, { auth: true });
}

export async function bloquearUsuario(idUsuario, bloqueado = true) {
  return peticionApi(`/api/admin/users/${idUsuario}/block`, {
    method: 'PUT',
    body: JSON.stringify({ bloqueado }),
  }, { auth: true, contentType: true });
}

export async function actualizarUsuario(idUsuario, datosUsuario) {
  return peticionApi(`/api/admin/users/${idUsuario}`, {
    method: 'PUT',
    body: JSON.stringify(datosUsuario),
  }, { auth: true, contentType: true });
}

export async function eliminarUsuario(idUsuario) {
  return peticionApi(`/api/admin/users/${idUsuario}`, {
    method: 'DELETE',
  }, { auth: true });
}

export default {
  URL_API,
  URL_API_RESPALDO,
  URLS_API,
  iniciarSesion,
  registrarUsuario,
  cerrarSesion,
  obtenerTodosLosProductos,
  obtenerProductosActivos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  crearPedido,
  obtenerPedido,
  obtenerMisPedidos,
  verificarSalud,
  actualizarPerfil,
  actualizarAliasPerfil,
  obtenerUsuarioActual,
  obtenerMisFavoritos,
  actualizarMisFavoritos,
  solicitarVinculoPadre,
  obtenerSolicitudesVinculoPadre,
  aprobarSolicitudVinculoPadre,
  rechazarSolicitudVinculoPadre,
  crearPedidoHijo,
  obtenerMisPedidosHijo,
  obtenerDetalleMiPedidoHijo,
  obtenerPedidosPadreHijo,
  obtenerDetallePedidoPadre,
  aprobarPedidoHijo,
  rechazarPedidoHijo,
  modificarPedidoHijo,
  marcarPedidoComoPagado,
  obtenerPedidoHistory,
  obtenerEstadisticasAdmin,
  registrarTokenDispositivo,
  unregistrarTokenDispositivo,
  obtenerMisNotificaciones,
  marcarNotificacionComoLeida,
  obtenerColaPedidosAdmin,
  obtenerRegistroFraude,
  obtenerTodosLosUsuarios,
  bloquearUsuario,
  actualizarUsuario,
  eliminarUsuario,
};
