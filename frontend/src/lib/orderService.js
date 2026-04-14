import {
  createChildOrder,
  createOrder,
  getMyChildOrderDetail,
  getMyChildOrders,
  getMyOrders,
  getOrder,
  getOrderHistory,
} from './api';

function normalizeCurrency(value) {
  return Number.parseFloat(value || 0) || 0;
}

function buildItemNotes(item) {
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

export function mapCartItemsToOrderPayload(cartItems = []) {
  return cartItems.map((item) => ({
    product_id: item.id,
    quantity: item.quantity,
    notes: buildItemNotes(item),
    chosen_options: item.chosen_options || {},
  }));
}

function buildChildOrderNotes(items = []) {
  return items
    .map((item) => {
      const note = buildItemNotes(item);
      return note ? `${item.name}: ${note}` : null;
    })
    .filter(Boolean)
    .join(' || ');
}

export async function submitOrderForUser(user, cartItems) {
  const items = mapCartItemsToOrderPayload(cartItems);

  if (!user) {
    throw new Error('Sesion no disponible');
  }

  if (user.role === 'child') {
    return createChildOrder(
      items.map(({ product_id, quantity }) => ({ product_id, quantity })),
      buildChildOrderNotes(cartItems)
    );
  }

  return createOrder({ items });
}

function summarizeItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return 'Sin productos';
  if (items.length === 1) return items[0].product_name || items[0].name || 'Producto';
  return `${items[0].product_name || items[0].name || 'Producto'} + ${items.length - 1} mas`;
}

function normalizeOrderStatus(status) {
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

function normalizeHistoryEntry(order, source) {
  const total = normalizeCurrency(order.total);
  const createdAt = order.created_at || order.fecha_creacion || order.date || new Date().toISOString();
  const items = Array.isArray(order.items) ? order.items : [];
  const child = order.child || null;
  const childName = child?.name || child?.nombre || order.child_name || '';
  const normalizedStatus = normalizeOrderStatus(order.status || order.estado);

  return {
    id: order.id,
    source,
    date: createdAt,
    status: normalizedStatus,
    total,
    itemsCount: order.items_count || items.length || 0,
    items,
    summary: summarizeItems(items),
    notes: order.notes || '',
    childName,
  };
}

export async function fetchOrderHistoryForUser(user) {
  if (!user) return [];

  if (user.role === 'child') {
    const response = await getMyChildOrders();
    return (response.orders || []).map((order) => normalizeHistoryEntry(order, 'child'));
  }

  if (user.role === 'parent') {
    const response = await getOrderHistory({});
    return (response.orders || []).map((order) => normalizeHistoryEntry(order, 'parent'));
  }

  const response = await getMyOrders();
  return (response.orders || []).map((order) => normalizeHistoryEntry(order, 'standard'));
}

export async function fetchOrderDetailForUser(user, historyEntry) {
  if (!user || !historyEntry?.id) {
    throw new Error('Pedido no disponible');
  }

  if (historyEntry.source === 'child') {
    const response = await getMyChildOrderDetail(historyEntry.id);
    return normalizeHistoryEntry(response.order, 'child');
  }

  if (historyEntry.source === 'standard') {
    const response = await getOrder(historyEntry.id);
    return normalizeHistoryEntry(response.order, 'standard');
  }

  return normalizeHistoryEntry(historyEntry, historyEntry.source || 'parent');
}

export function buildProfileStatsFromOrders(orders = [], user = null) {
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + normalizeCurrency(order.total), 0);

  return {
    totalOrders,
    totalSpent,
    favoriteProduct: totalOrders > 0 ? orders[0].summary : 'Sin historial',
    memberSince: user?.created_at || null,
  };
}

export function buildAchievementsFromOrders(orders = []) {
  const totalOrders = orders.length;

  return [
    { id: 1, name: 'Primer pedido', icon: '🎉', unlocked: totalOrders >= 1 },
    { id: 2, name: 'Coffee lover', icon: '☕', unlocked: totalOrders >= 3 },
    { id: 3, name: 'Fiel cliente', icon: '⭐', unlocked: totalOrders >= 10 },
    { id: 4, name: 'Cliente constante', icon: '🌱', unlocked: totalOrders >= 20 },
  ];
}
