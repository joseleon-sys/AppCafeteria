import { peticionApi } from './client';

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
