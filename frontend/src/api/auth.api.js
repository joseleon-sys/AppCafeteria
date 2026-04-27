import { obtenerRefreshTokenAuth, peticionApi } from './client';

export async function iniciarSesion(credenciales) {
  return peticionApi('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credenciales),
  }, { contentType: true });
}

export async function registrarUsuario(datosUsuario) {
  return peticionApi('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(datosUsuario),
  }, { contentType: true });
}

export async function restablecerContrasena(payload) {
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
