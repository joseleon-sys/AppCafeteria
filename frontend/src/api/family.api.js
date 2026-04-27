import { peticionApi } from './client';

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
