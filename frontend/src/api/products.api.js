import { peticionApi } from './client';

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
