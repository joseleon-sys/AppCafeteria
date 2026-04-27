import { peticionApi } from './client';

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
