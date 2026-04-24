// Utilidades del frontend para guardar y recuperar la sesion del usuario.
import { obtenerUsuarioActual } from './api';

const TOKEN_KEY = 'cafeteria_token';
const USER_KEY = 'cafeteria_user';

export function obtenerTokenGuardado() {
  // Lee el token actual del almacenamiento local del navegador.
  return localStorage.getItem(TOKEN_KEY);
}

export function obtenerUsuarioGuardado() {
  // Lee el usuario guardado y lo convierte desde JSON a objeto JavaScript.
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    console.error('Error al leer el usuario guardado:', error);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function guardarUsuario(user) {
  // Persiste la informacion basica del usuario para futuras cargas.
  if (!user) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function limpiarSesion() {
  // Borra los datos locales de sesion.
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function crearUsuarioSesion(usuarioActual = {}) {
  // De la respuesta completa del backend nos quedamos con lo que la UI necesita a menudo.
  return {
    role: usuarioActual.role,
    email: usuarioActual.email,
    name: usuarioActual.name,
    alias: usuarioActual.alias || null,
    idUsuario: usuarioActual.id,
    tokenPadre: usuarioActual.tokenPadre || null,
    isAdult: usuarioActual.isAdult,
    specialCode: usuarioActual.specialCode || null,
    created_at: usuarioActual.created_at || null,
  };
}

export async function cargarUsuarioSesion() {
  // Si hay token, refresca el usuario real desde API; si no, intenta usar lo guardado.
  const token = obtenerTokenGuardado();

  if (!token) {
    return obtenerUsuarioGuardado();
  }

  const response = await obtenerUsuarioActual();
  const usuarioActual = response?.user;

  if (!usuarioActual) {
    throw new Error('Usuario no disponible');
  }

  return crearUsuarioSesion(usuarioActual);
}
