// Servicio de API para comunicarse con el backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthToken() {
  return localStorage.getItem('cafeteria_token');
}

function getAuthHeaders(includeContentType = false) {
  const token = getAuthToken();
  const headers = {};

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Manejo genérico de respuestas fetch
 */
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * PRODUCTOS
 */

// Obtener todos los productos (admin)
export async function getAllProducts() {
  const response = await fetch(`${API_URL}/api/products`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// Obtener solo productos activos (usuarios)
export async function getActiveProducts() {
  const response = await fetch(`${API_URL}/api/menu`);
  return handleResponse(response);
}

// Crear nuevo producto
export async function createProduct(productData) {
  const response = await fetch(`${API_URL}/api/products`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(productData),
  });
  return handleResponse(response);
}

// Actualizar producto existente
export async function updateProduct(id, productData) {
  const response = await fetch(`${API_URL}/api/products/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify(productData),
  });
  return handleResponse(response);
}

// Eliminar producto (borrado lógico por defecto)
export async function deleteProduct(id, permanent = false) {
  const url = permanent 
    ? `${API_URL}/api/products/${id}?permanent=true`
    : `${API_URL}/api/products/${id}`;
    
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

/**
 * ÓRDENES
 */

// Crear nueva orden
export async function createOrder(orderData) {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
  return handleResponse(response);
}

// Obtener detalle de orden
export async function getOrder(id) {
  const response = await fetch(`${API_URL}/api/orders/${id}`);
  return handleResponse(response);
}

/**
 * HEALTHCHECK
 */
export async function healthCheck() {
  const response = await fetch(`${API_URL}/api/health`);
  return handleResponse(response);
}

/**
 * PERFIL DE USUARIO
 */
export async function updateProfileAlias(alias) {
  const response = await fetch(`${API_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ alias }),
  });
  return handleResponse(response);
}

export async function getCurrentUser() {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

/**
 * CHILD ORDERS (FASE 3)
 */

// Crear pedido como hijo
export async function createChildOrder(items, notes = '', parentId = null) {
  const response = await fetch(`${API_URL}/api/child/orders`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ items, notes, parent_id: parentId }),
  });
  return handleResponse(response);
}

// Ver mis pedidos (como hijo)
export async function getMyChildOrders(status = null) {
  const url = new URL(`${API_URL}/api/child/orders`);
  if (status) url.searchParams.append('status', status);
  
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// Ver detalle de mi pedido (como hijo)
export async function getMyChildOrderDetail(orderId) {
  const response = await fetch(`${API_URL}/api/child/orders/${orderId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// Ver pedidos de mis hijos (como padre)
export async function getParentChildOrders(filters = {}) {
  const url = new URL(`${API_URL}/api/parent/child-orders`);
  if (filters.status) url.searchParams.append('status', filters.status);
  if (filters.child_id) url.searchParams.append('child_id', filters.child_id);
  if (filters.limit) url.searchParams.append('limit', filters.limit);
  if (filters.offset) url.searchParams.append('offset', filters.offset);
  
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// Ver detalle de pedido de hijo (como padre)
export async function getParentOrderDetail(orderId) {
  const response = await fetch(`${API_URL}/api/parent/orders/${orderId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// Aprobar pedido (como padre)
export async function approveChildOrder(orderId, approvedAmount = null) {
  const response = await fetch(`${API_URL}/api/parent/orders/${orderId}/approve`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ approved_amount: approvedAmount }),
  });
  return handleResponse(response);
}

// Rechazar pedido (como padre)
export async function rejectChildOrder(orderId, reason) {
  const response = await fetch(`${API_URL}/api/parent/orders/${orderId}/reject`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(response);
}

// Modificar pedido (como padre)
export async function modifyChildOrder(orderId, items) {
  const response = await fetch(`${API_URL}/api/parent/orders/${orderId}/modify`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ items }),
  });
  return handleResponse(response);
}

// Marcar como pagado (como padre)
export async function markOrderAsPaid(orderId, paymentMethod = 'cash', amountPaid = null) {
  const response = await fetch(`${API_URL}/api/parent/orders/${orderId}/pay`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ payment_method: paymentMethod, amount_paid: amountPaid }),
  });
  return handleResponse(response);
}

// Ver historial de pedidos (como padre)
export async function getOrderHistory(filters = {}) {
  const url = new URL(`${API_URL}/api/parent/child-orders/history`);
  if (filters.child_id) url.searchParams.append('child_id', filters.child_id);
  if (filters.status) url.searchParams.append('status', filters.status);
  if (filters.from_date) url.searchParams.append('from_date', filters.from_date);
  if (filters.to_date) url.searchParams.append('to_date', filters.to_date);
  if (filters.limit) url.searchParams.append('limit', filters.limit);
  
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// ===== ADMIN: User Management =====
export async function getAllUsers() {
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  return handleResponse(response);
}

export async function blockUser(userId, blocked = true) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/block`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ blocked })
  });
  return handleResponse(response);
}

export async function updateUser(userId, userData) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(userData)
  });
  return handleResponse(response);
}

export async function deleteUser(userId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  return handleResponse(response);
}

export default {
  getAllProducts,
  getActiveProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  createOrder,
  getOrder,
  healthCheck,
  updateProfileAlias,
  getCurrentUser,
  // FASE 3: Child Orders
  createChildOrder,
  getMyChildOrders,
  getMyChildOrderDetail,
  getParentChildOrders,
  getParentOrderDetail,
  approveChildOrder,
  rejectChildOrder,
  modifyChildOrder,
  markOrderAsPaid,
  getOrderHistory,
  // Admin: User Management
  getAllUsers,
  blockUser,
  updateUser,
  deleteUser,
};
