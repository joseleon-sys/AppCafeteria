// Servicio de frontend para normalizar pedidos y unificar el flujo adulto/menor.
import {
  crearPedidoHijo,
  crearPedido,
  obtenerDetalleMiPedidoHijo,
  obtenerMisPedidosHijo,
  obtenerMisPedidos,
  obtenerPedido,
  obtenerPedidoHistory,
} from './api';

function normalizarMoneda(value) {
  // Convierte cualquier entrada numerica a un float seguro.
  return Number.parseFloat(value || 0) || 0;
}

function normalizarItems(items = []) {
  // Adapta distintos formatos de items a una estructura comun para la UI.
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      ...item,
      quantity: Number.parseInt(item.quantity, 10) || 1,
      price: normalizarMoneda(item.price),
      subtotal: normalizarMoneda(item.subtotal ?? ((Number.parseFloat(item.price) || 0) * (Number.parseInt(item.quantity, 10) || 1))),
      product_name: item.product_name || item.nombre_producto || item.name || 'Producto',
      name: item.name || item.product_name || item.nombre_producto || 'Producto',
      notes: item.notes || item.notas || '',
    }));
}

function buildItemNotes(item) {
  // Junta notas manuales y opciones elegidas en un solo texto legible.
  const parts = [];
  const chosenOptions = item?.chosen_options || {};

  if (item?.notes) {
    parts.push(String(item.notes).trim());
  }

  if (Array.isArray(chosenOptions.removed) && chosenOptions.removed.length > 0) {
    parts.push(`Sin: ${chosenOptions.removed.join(', ')}`);
  }

  if (chosenOptions.sugar !== undefined && chosenOptions.sugar !== null && chosenOptions.sugar !== '') {
    parts.push(`Azucar: ${chosenOptions.sugar}`);
  }

  return parts.filter(Boolean).join(' | ');
}

export function mapearItemsCarritoAPayloadPedido(cartItems = []) {
  // Pasa del formato del carrito al formato esperado por las rutas de pedidos.
  return cartItems.map((item) => ({
    product_id: item.id,
    quantity: item.quantity,
    notes: buildItemNotes(item),
    chosen_options: item.chosen_options || {},
  }));
}

function construirNotasPedidoHijo(items = []) {
  return items
    .map((item) => {
      const note = buildItemNotes(item);
      return note ? `${item.name}: ${note}` : null;
    })
    .filter(Boolean)
    .join(' || ');
}

export async function enviarPedidoParaUsuario(user, cartItems) {
  // Decide automaticamente si el pedido va por flujo adulto o por flujo de menor.
  const items = mapearItemsCarritoAPayloadPedido(cartItems);

  if (!user) {
    throw new Error('Sesion no disponible');
  }

  if (user.role === 'child') {
    return crearPedidoHijo(
      items.map(({ product_id, quantity }) => ({ product_id, quantity })),
      construirNotasPedidoHijo(cartItems)
    );
  }

  return crearPedido({ items });
}

function resumirItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return 'Sin productos';
  const firstItem = items.find((item) => item && typeof item === 'object');
  if (!firstItem) return 'Sin productos';
  if (items.length === 1) return firstItem.product_name || firstItem.name || 'Producto';
  return `${firstItem.product_name || firstItem.name || 'Producto'} + ${items.length - 1} mas`;
}

function normalizarEstadoPedido(status) {
  const normalized = String(status || '').trim().toLowerCase();

  if (['pagado', 'paid', 'completed', 'completado', 'completada'].includes(normalized)) {
    return 'paid';
  }
  if (['pendiente', 'pending', 'procesando', 'processing'].includes(normalized)) {
    return 'pending';
  }
  if (['aprobado', 'approved'].includes(normalized)) {
    return 'approved';
  }
  if (['rechazado', 'rejected', 'cancelado', 'cancelled'].includes(normalized)) {
    return 'rejected';
  }

  return normalized || 'pending';
}

function normalizarEntradaHistorial(order, source) {
  // Convierte respuestas heterogeneas de la API a una sola estructura de historial.
  const safeOrder = order && typeof order === 'object' ? order : {};
  const total = normalizarMoneda(safeOrder.total);
  const createdAt = safeOrder.created_at || safeOrder.fecha_creacion || safeOrder.date || new Date().toISOString();
  const items = normalizarItems(safeOrder.items);
  const child = safeOrder.child || null;
  const childName = child?.name || child?.nombre || safeOrder.child_name || '';
  const normalizedStatus = normalizarEstadoPedido(safeOrder.status || safeOrder.estado);

  return {
    id: safeOrder.id,
    source,
    date: createdAt,
    status: normalizedStatus,
    total,
    itemsCount: safeOrder.items_count || items.length || 0,
    items,
    summary: resumirItems(items),
    notes: safeOrder.notes || '',
    childName,
  };
}

function extraerPedidos(response) {
  if (!response || typeof response !== 'object') return [];
  if (Array.isArray(response.orders)) return response.orders;
  if (Array.isArray(response.history)) return response.history;
  return [];
}

export async function obtenerHistorialPedidosParaUsuario(user) {
  if (!user) return [];

  if (user.role === 'child') {
    const response = await obtenerMisPedidosHijo();
    return extraerPedidos(response).map((order) => normalizarEntradaHistorial(order, 'child'));
  }

  if (user.role === 'parent') {
    const [parentHistoryResult, standardHistoryResult] = await Promise.allSettled([
      obtenerPedidoHistory({}),
      obtenerMisPedidos(),
    ]);

    const parentOrders = parentHistoryResult.status === 'fulfilled'
      ? extraerPedidos(parentHistoryResult.value).map((order) => normalizarEntradaHistorial(order, 'parent'))
      : [];

    const standardOrders = standardHistoryResult.status === 'fulfilled'
      ? extraerPedidos(standardHistoryResult.value).map((order) => normalizarEntradaHistorial(order, 'standard'))
      : [];

    if (
      parentHistoryResult.status === 'rejected'
      && standardHistoryResult.status === 'rejected'
    ) {
      throw standardHistoryResult.reason || parentHistoryResult.reason || new Error('No se pudo cargar el historial');
    }

    const seen = new Set();
    return [...standardOrders, ...parentOrders]
      .filter((order) => {
        const key = `${order.source}:${String(order.id)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const response = await obtenerMisPedidos();
  return extraerPedidos(response).map((order) => normalizarEntradaHistorial(order, 'standard'));
}

export async function obtenerDetallePedidoParaUsuario(user, historyEntry) {
  if (!user || !historyEntry?.id) {
    throw new Error('Pedido no disponible');
  }

  if (historyEntry.source === 'child') {
    const response = await obtenerDetalleMiPedidoHijo(historyEntry.id);
    return normalizarEntradaHistorial(response.order, 'child');
  }

  if (historyEntry.source === 'standard') {
    const response = await obtenerPedido(historyEntry.id);
    return normalizarEntradaHistorial(response?.order, 'standard');
  }

  return normalizarEntradaHistorial(historyEntry, historyEntry.source || 'parent');
}

export function construirEstadisticasPerfilDesdePedidos(orders = [], user = null) {
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + normalizarMoneda(order.total), 0);

  return {
    totalOrders,
    totalSpent,
    favoriteProduct: totalOrders > 0 ? orders[0].summary : 'Sin historial',
    memberSince: user?.created_at || null,
  };
}

export function construirLogrosDesdePedidos(orders = []) {
  const totalOrders = orders.length;

  return [
    { id: 1, name: 'Primer pedido', icon: '🎉', unlocked: totalOrders >= 1 },
    { id: 2, name: 'Coffee lover', icon: '☕', unlocked: totalOrders >= 3 },
    { id: 3, name: 'Fiel cliente', icon: '⭐', unlocked: totalOrders >= 10 },
    { id: 4, name: 'Cliente constante', icon: '🌱', unlocked: totalOrders >= 20 },
  ];
}
