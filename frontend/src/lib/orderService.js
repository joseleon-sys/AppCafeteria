import {
  createChildOrder,
  createOrder,
  getMyChildOrderDetail,
  getMyChildOrders,
  getMyOrders,
  getOrder,
  getOrderHistory,
} from './api';

const DEV_BYPASS_ORDERS_STORAGE_KEY = 'cafeteria_dev_bypass_orders';

function normalizeCurrency(value) {
  return Number.parseFloat(value || 0) || 0;
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      ...item,
      quantity: Number.parseInt(item.quantity, 10) || 1,
      price: normalizeCurrency(item.price),
      subtotal: normalizeCurrency(item.subtotal ?? ((Number.parseFloat(item.price) || 0) * (Number.parseInt(item.quantity, 10) || 1))),
      product_name: item.product_name || item.nombre_producto || item.name || 'Producto',
      name: item.name || item.product_name || item.nombre_producto || 'Producto',
      notes: item.notes || item.notas || '',
    }));
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
  const firstItem = items.find((item) => item && typeof item === 'object');
  if (!firstItem) return 'Sin productos';
  if (items.length === 1) return firstItem.product_name || firstItem.name || 'Producto';
  return `${firstItem.product_name || firstItem.name || 'Producto'} + ${items.length - 1} mas`;
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
  const safeOrder = order && typeof order === 'object' ? order : {};
  const total = normalizeCurrency(safeOrder.total);
  const createdAt = safeOrder.created_at || safeOrder.fecha_creacion || safeOrder.date || new Date().toISOString();
  const items = normalizeItems(safeOrder.items);
  const child = safeOrder.child || null;
  const childName = child?.name || child?.nombre || safeOrder.child_name || '';
  const normalizedStatus = normalizeOrderStatus(safeOrder.status || safeOrder.estado);

  return {
    id: safeOrder.id,
    source,
    date: createdAt,
    status: normalizedStatus,
    total,
    itemsCount: safeOrder.items_count || items.length || 0,
    items,
    summary: summarizeItems(items),
    notes: safeOrder.notes || '',
    childName,
  };
}

function extractOrders(response) {
  if (!response || typeof response !== 'object') return [];
  if (Array.isArray(response.orders)) return response.orders;
  if (Array.isArray(response.history)) return response.history;
  return [];
}

function readStoredDevBypassOrders() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(DEV_BYPASS_ORDERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredDevBypassOrders(orders) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEV_BYPASS_ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

export function storeDevBypassOrder(order) {
  if (!order?.id) return;

  const existing = readStoredDevBypassOrders().filter((entry) => String(entry.id) !== String(order.id));
  writeStoredDevBypassOrders([order, ...existing].slice(0, 20));
}

export async function fetchOrderHistoryForUser(user) {
  if (!user) return [];

  if (user.role === 'child') {
    const response = await getMyChildOrders();
    return extractOrders(response).map((order) => normalizeHistoryEntry(order, 'child'));
  }

  if (user.role === 'parent') {
    try {
      const response = await getOrderHistory({});
      return extractOrders(response).map((order) => normalizeHistoryEntry(order, 'parent'));
    } catch {
      const fallbackResponse = await getMyOrders();
      return extractOrders(fallbackResponse).map((order) => normalizeHistoryEntry(order, 'standard'));
    }
  }

  const response = await getMyOrders();
  const apiOrders = extractOrders(response).map((order) => normalizeHistoryEntry(order, 'standard'));
  const localDevOrders = readStoredDevBypassOrders()
    .filter((order) => String(order.user_id) === String(user.userId || user.id))
    .map((order) => normalizeHistoryEntry(order, 'standard'));

  const seen = new Set();
  return [...localDevOrders, ...apiOrders].filter((order) => {
    const key = String(order.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
    try {
      const response = await getOrder(historyEntry.id);
      return normalizeHistoryEntry(response?.order, 'standard');
    } catch (error) {
      const localOrder = readStoredDevBypassOrders().find((order) => String(order.id) === String(historyEntry.id));
      if (localOrder) {
        return normalizeHistoryEntry(localOrder, 'standard');
      }
      throw error;
    }
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
