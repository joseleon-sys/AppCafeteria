const API_URL = import.meta.env.VITE_API_URL || import.meta.env.BACKEND_URL || 'http://localhost:3000';

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

async function handleResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return payload;
}

async function apiRequest(path, options = {}, { auth = false, contentType = false } = {}) {
  const headers = {
    ...(auth ? getAuthHeaders(contentType) : (contentType ? { 'Content-Type': 'application/json' } : {})),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  return handleResponse(response);
}

export { API_URL, getAuthToken, getAuthHeaders, handleResponse, apiRequest };

export async function loginUser(credentials) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }, { contentType: true });
}

export async function registerUser(userData) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }, { contentType: true });
}

export async function getAllProducts() {
  return apiRequest('/api/products', {}, { auth: true });
}

export async function getActiveProducts() {
  return apiRequest('/api/menu');
}

export async function createProduct(productData) {
  return apiRequest('/api/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  }, { auth: true, contentType: true });
}

export async function updateProduct(id, productData) {
  return apiRequest(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  }, { auth: true, contentType: true });
}

export async function deleteProduct(id, permanent = false) {
  const suffix = permanent ? '?permanent=true' : '';
  return apiRequest(`/api/products/${id}${suffix}`, {
    method: 'DELETE',
  }, { auth: true });
}

export async function createOrder(orderData) {
  return apiRequest('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  }, { auth: true, contentType: true });
}

export async function getOrder(id) {
  return apiRequest(`/api/orders/${id}`, {}, { auth: true });
}

export async function getMyOrders(status = null, limit = 50) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (limit) params.append('limit', String(limit));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/api/orders/my${suffix}`, {}, { auth: true });
}

export async function healthCheck() {
  return apiRequest('/api/health');
}

export async function updateProfile(alias, specialCode = undefined) {
  return apiRequest('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ alias, ...(specialCode !== undefined ? { specialCode } : {}) }),
  }, { auth: true, contentType: true });
}

export async function updateProfileAlias(alias) {
  return updateProfile(alias);
}

export async function getCurrentUser() {
  return apiRequest('/api/auth/me', {}, { auth: true });
}

export async function getMyFavorites() {
  return apiRequest('/api/auth/favorites', {}, { auth: true });
}

export async function updateMyFavorites(favoriteIds) {
  return apiRequest('/api/auth/favorites', {
    method: 'PUT',
    body: JSON.stringify({ favoriteIds }),
  }, { auth: true, contentType: true });
}

export async function requestParentLink(parentToken) {
  return apiRequest('/api/child/link-parent', {
    method: 'POST',
    body: JSON.stringify({ parentToken }),
  }, { auth: true, contentType: true });
}

export async function getParentLinkRequests() {
  return apiRequest('/api/parent/link-requests', {}, { auth: true });
}

export async function approveParentLinkRequest(requestId, spendingLimit = 20) {
  return apiRequest(`/api/parent/link-requests/${requestId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ spendingLimit }),
  }, { auth: true, contentType: true });
}

export async function rejectParentLinkRequest(requestId, reason) {
  return apiRequest(`/api/parent/link-requests/${requestId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  }, { auth: true, contentType: true });
}

export async function getMyParentLinks() {
  return apiRequest('/api/child/my-parents', {}, { auth: true });
}

export async function getMyChildrenLinks() {
  return apiRequest('/api/parent/my-children', {}, { auth: true });
}

export async function createChildOrder(items, notes = '', parentId = null) {
  return apiRequest('/api/child/orders', {
    method: 'POST',
    body: JSON.stringify({ items, notes, parent_id: parentId }),
  }, { auth: true, contentType: true });
}

export async function getMyChildOrders(status = null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest(`/api/child/orders${query}`, {}, { auth: true });
}

export async function getMyChildOrderDetail(orderId) {
  return apiRequest(`/api/child/orders/${orderId}`, {}, { auth: true });
}

export async function getParentChildOrders(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.child_id) params.append('child_id', filters.child_id);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/api/parent/child-orders${suffix}`, {}, { auth: true });
}

export async function getParentOrderDetail(orderId) {
  return apiRequest(`/api/parent/orders/${orderId}`, {}, { auth: true });
}

export async function approveChildOrder(orderId, approvedAmount = null) {
  return apiRequest(`/api/parent/orders/${orderId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ approved_amount: approvedAmount }),
  }, { auth: true, contentType: true });
}

export async function rejectChildOrder(orderId, reason) {
  return apiRequest(`/api/parent/orders/${orderId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  }, { auth: true, contentType: true });
}

export async function modifyChildOrder(orderId, items) {
  return apiRequest(`/api/parent/orders/${orderId}/modify`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  }, { auth: true, contentType: true });
}

export async function markOrderAsPaid(orderId, paymentMethod = 'cash', amountPaid = null) {
  return apiRequest(`/api/parent/orders/${orderId}/pay`, {
    method: 'PUT',
    body: JSON.stringify({ payment_method: paymentMethod, amount_paid: amountPaid }),
  }, { auth: true, contentType: true });
}

export async function getOrderHistory(filters = {}) {
  const params = new URLSearchParams();
  if (filters.child_id) params.append('child_id', filters.child_id);
  if (filters.status) params.append('status', filters.status);
  if (filters.from_date) params.append('from_date', filters.from_date);
  if (filters.to_date) params.append('to_date', filters.to_date);
  if (filters.limit) params.append('limit', String(filters.limit));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/api/parent/child-orders/history${suffix}`, {}, { auth: true });
}

export async function getAdminStatistics() {
  return apiRequest('/api/admin/statistics', {}, { auth: true });
}

export async function getAdminOrderQueue() {
  return apiRequest('/api/admin/orders/queue', {}, { auth: true });
}

export async function getFraudLog() {
  return apiRequest('/api/admin/fraud-log', {}, { auth: true });
}

export async function getAllUsers() {
  return apiRequest('/api/admin/users', {}, { auth: true });
}

export async function blockUser(userId, blocked = true) {
  return apiRequest(`/api/admin/users/${userId}/block`, {
    method: 'PUT',
    body: JSON.stringify({ blocked }),
  }, { auth: true, contentType: true });
}

export async function updateUser(userId, userData) {
  return apiRequest(`/api/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }, { auth: true, contentType: true });
}

export async function deleteUser(userId) {
  return apiRequest(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  }, { auth: true });
}

export default {
  API_URL,
  loginUser,
  registerUser,
  getAllProducts,
  getActiveProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  createOrder,
  getOrder,
  getMyOrders,
  healthCheck,
  updateProfile,
  updateProfileAlias,
  getCurrentUser,
  getMyFavorites,
  updateMyFavorites,
  requestParentLink,
  getParentLinkRequests,
  approveParentLinkRequest,
  rejectParentLinkRequest,
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
  getAdminStatistics,
  getAdminOrderQueue,
  getFraudLog,
  getAllUsers,
  blockUser,
  updateUser,
  deleteUser,
};
