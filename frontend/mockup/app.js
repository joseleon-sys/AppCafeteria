/**
 * CafeteriaApp — Mockup JavaScript
 * 
 * Prototipo funcional para demostrar la UX antes de implementar en React.
 * 
 * ESTRUCTURA:
 * 1. Constantes y configuración
 * 2. LocalStorage helpers (usuarios, carrito)
 * 3. Estado de la aplicación
 * 4. Referencias del DOM
 * 5. Funciones de autenticación
 * 6. Funciones de UI (categorías, productos)
 * 7. Carrito y pedidos
 * 8. Event listeners
 * 9. Inicialización
 */

/* ============================================
   1. CONSTANTES Y CONFIGURACIÓN
   ============================================ */
const STORAGE_KEYS = {
  users: 'caf_users',
  current: 'caf_current',
  cart: 'caf_cart',
  orders: 'caf_orders'
};

// Catálogo de productos (después se traerá de la API)
const CATEGORIES = [
  { id: 'cafes', name: 'Cafés' },
  { id: 'sandwich', name: 'Bocadillos' },
  { id: 'dulces', name: 'Dulces' },
  { id: 'bebidas', name: 'Bebidas' },
  { id: 'otros', name: 'Otros' }
];

const PRODUCTS = {
  cafes: [
    {
      id: 'c1',
      name: 'Café solo',
      price: 1.20,
      oldPrice: 1.50,
      category: 'Café clásico',
      description: 'Espresso italiano intenso y aromático, preparado con granos 100% arábica.',
      features: ['100% Arábica', 'Intenso', 'Recién molido'],
      badge: 'POPULAR',
      image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&q=80',
      extras: [{ id: 'sugar', name: 'Azúcar extra', type: 'number', min: 0, max: 3, step: 1 }],
      removables: []
    },
    {
      id: 'c2',
      name: 'Café con leche',
      price: 1.80,
      oldPrice: 2.20,
      category: 'Café con leche',
      description: 'Equilibrio perfecto entre café espresso y leche vaporizada cremosa.',
      features: ['Leche fresca', 'Suave', 'Cremoso'],
      badge: 'HOT SALE',
      image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400&q=80',
      allergens: ['lacteos'],
      extras: [{ id: 'sugar', name: 'Azúcar extra', type: 'number', min: 0, max: 3, step: 1 }],
      removables: ['Leche']
    },
    {
      id: 'c3',
      name: 'Cappuccino',
      price: 2.20,
      oldPrice: 2.80,
      category: 'Café premium',
      description: 'Café espresso con leche vaporizada y espuma de leche cremosa, decorado con cacao.',
      features: ['Espuma cremosa', 'Arte latte', 'Premium'],
      badge: 'NUEVO',
      image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
      allergens: ['lacteos'],
      extras: [{ id: 'sugar', name: 'Azúcar extra', type: 'number', min: 0, max: 3, step: 1 }],
      removables: []
    }
  ],
  sandwich: [
    {
      id: 'b1',
      name: 'Bocadillo jamón',
      price: 3.50,
      oldPrice: 4.20,
      category: 'Bocadillo caliente',
      description: 'Pan artesanal crujiente con jamón serrano de primera calidad, tomate y aceite de oliva.',
      features: ['Pan artesanal', 'Jamón serrano', 'Ingredientes frescos'],
      badge: 'POPULAR',
      image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&q=80',
      extras: [],
      removables: ['Tomate', 'Lechuga']
    },
    {
      id: 'b2',
      name: 'Bocadillo vegetal',
      price: 3.00,
      oldPrice: 3.80,
      category: 'Opción vegetariana',
      description: 'Bocadillo vegetal con aguacate, tomate, lechuga, aceitunas y aliño mediterráneo.',
      features: ['100% Vegetal', 'Saludable', 'Fresco'],
      badge: 'NUEVO',
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80',
      extras: [],
      removables: ['Aceitunas', 'Tomate']
    }
  ],
  dulces: [
    {
      id: 'd1',
      name: 'Croissant',
      price: 1.50,
      oldPrice: 1.90,
      category: 'Bollería francesa',
      description: 'Croissant de mantequilla recién horneado, con capas crujientes y doradas.',
      features: ['Recién horneado', 'Mantequilla', 'Francés'],
      badge: 'HOT SALE',
      image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80',
      allergens: ['gluten', 'lacteos'],
      extras: [],
      removables: []
    },
    {
      id: 'd2',
      name: 'Palmera de chocolate',
      price: 1.80,
      oldPrice: 2.30,
      category: 'Bollería dulce',
      description: 'Hojaldre crujiente con generosa cobertura de chocolate belga premium.',
      features: ['Chocolate belga', 'Crujiente', 'Premium'],
      badge: 'POPULAR',
      image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400&q=80',
      allergens: ['gluten', 'lacteos'],
      extras: [],
      removables: []
    }
  ],
  bebidas: [
    {
      id: 'be1',
      name: 'Zumo naranja',
      price: 2.50,
      oldPrice: 3.00,
      category: 'Bebida natural',
      description: 'Zumo de naranja recién exprimido, 100% natural sin azúcares añadidos.',
      features: ['100% Natural', 'Vitamina C', 'Sin azúcar añadido'],
      badge: 'NUEVO',
      image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80',
      extras: [],
      removables: []
    },
    {
      id: 'be2',
      name: 'Batido de fresa',
      price: 3.20,
      oldPrice: 3.90,
      category: 'Bebida fría',
      description: 'Batido cremoso de fresas frescas con leche y helado, decorado con nata.',
      features: ['Fresas frescas', 'Cremoso', 'Con nata'],
      badge: 'POPULAR',
      image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400&q=80',
      allergens: ['lacteos'],
      extras: [],
      removables: []
    }
  ],
  otros: [
    {
      id: 'o1',
      name: 'Agua',
      price: 1.00,
      oldPrice: 1.30,
      category: 'Bebida',
      description: 'Agua mineral natural de manantial, fresca y purificada.',
      features: ['Mineral', 'Fresca', 'Natural'],
      badge: 'BÁSICO',
      image: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=400&q=80',
      extras: [],
      removables: []
    }
  ]
};

/* ============================================
   2. LOCALSTORAGE HELPERS
   ============================================ */
// Usuarios
const loadUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || '[]');
  } catch (e) {
    console.error('Error loading users:', e);
    return [];
  }
};

const saveUsers = (users) => {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
};

const setCurrent = (user) => {
  localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(user));
};

const getCurrent = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.current) || 'null');
  } catch (e) {
    return null;
  }
};

const clearCurrent = () => {
  localStorage.removeItem(STORAGE_KEYS.current);
};

// Carrito
const loadCart = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) || '[]');
  } catch (e) {
    return [];
  }
};

const saveCart = (cart) => {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
};

const clearCart = () => {
  localStorage.removeItem(STORAGE_KEYS.cart);
};

// Pedidos
const loadOrders = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.orders) || '[]');
  } catch (e) {
    return [];
  }
};

const saveOrder = (order) => {
  const orders = loadOrders();
  orders.unshift(order); // Añadir al inicio
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
};

const getOrderById = (orderId) => {
  const orders = loadOrders();
  return orders.find(o => o.id === orderId);
};

/* ============================================
   3. ESTADO DE LA APLICACIÓN
   ============================================ */
let selectedProduct = null;
let currentOptions = {
  extras: {},
  removals: [],
  quantity: 1
};

/* ============================================
   4. REFERENCIAS DEL DOM
   ============================================ */
// Pantallas
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');

// Login
const loginForm = document.getElementById('login-form');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');

// Menú lateral
const hamburger = document.getElementById('hamburger');
const sideMenu = document.getElementById('side-menu');
const menuUsername = document.getElementById('menu-username');
const deleteAccountBtn = document.getElementById('delete-account');

// Categorías y productos
const categoriesEl = document.getElementById('categories');
const productsEl = document.getElementById('products');

// Drawer de producto
const productDrawer = document.getElementById('product-drawer');
const drawerTitle = document.getElementById('drawer-title');
const drawerBody = document.getElementById('drawer-body');
const drawerPrice = document.getElementById('drawer-price');
const drawerClose = document.getElementById('drawer-close');
const addToCartBtn = document.getElementById('add-to-cart-btn');

// Modal del carrito
const cartModal = document.getElementById('cart-modal');
const cartBody = document.getElementById('cart-body');
const cartTotalAmount = document.getElementById('cart-total-amount');
const closeCartBtn = document.getElementById('close-cart-btn');
const clearCartBtn = document.getElementById('clear-cart-btn');
const continueOrderBtn = document.getElementById('continue-order-btn');
const payBtn = document.getElementById('pay-btn');

// Bottom nav
const navHome = document.getElementById('nav-home');
const navHistory = document.getElementById('nav-history');
const navCart = document.getElementById('nav-cart');
const navFavorites = document.getElementById('nav-favorites');
const navProfile = document.getElementById('nav-profile');

// Pantallas de pedidos
const orderConfirmationScreen = document.getElementById('order-confirmation-screen');
const ordersHistoryScreen = document.getElementById('orders-history-screen');
const orderBackBtn = document.querySelector('.order-back-btn');
const historyBackBtn = document.querySelector('#orders-history-screen .order-back-btn');
const historyContent = document.querySelector('.history-content');
const cartBadge = document.getElementById('cart-badge');

// Filter button
const filterBtn = document.getElementById('filter-btn');
const logoutMenuBtn = document.getElementById('logout-menu-btn');

// Overlay y toast
const overlay = document.getElementById('overlay');
const toastEl = document.getElementById('toast');

/* ============================================
   5. FUNCIONES DE AUTENTICACIÓN
   ============================================ */
const showLogin = () => {
  loginScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
};

const showMain = () => {
  loginScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  
  // Actualizar nombre de usuario en el menú
  const current = getCurrent();
  if (menuUsername) {
    menuUsername.textContent = current?.username || 'Invitado';
  }
};

const handleLogin = (e) => {
  e.preventDefault();
  
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  
  const users = loadUsers();
  const found = users.find(u => u.username === username && u.password === password);
  
  if (found) {
    // Guardar todo el objeto del usuario, incluyendo alergias
    setCurrent(found);
    showMain();
    showToast(`¡Bienvenido, ${username}!`);
    
    // Re-renderizar productos para mostrar alertas de alérgenos
    if (CATEGORIES.length) {
      selectCategory(CATEGORIES[0].id);
    }
  } else {
    showToast('Credenciales inválidas. Prueba demo/demo', 2000);
  }
};

const handleSignup = () => {
  const username = prompt('Nombre de usuario:');
  if (!username) return;
  
  const password = prompt('Contraseña:');
  const users = loadUsers();
  
  if (users.find(u => u.username === username)) {
    showToast('El usuario ya existe', 2000);
    return;
  }
  
  users.push({ username, password: password || '' });
  saveUsers(users);
  showToast('Cuenta creada. Ahora inicia sesión.');
};

const handleLogout = () => {
  clearCurrent();
  if (menuUsername) menuUsername.textContent = 'Invitado';
  sideMenu.classList.add('hidden');
  overlayHide();
  showLogin();
  showToast('Sesión cerrada');
};

const handleDeleteAccount = () => {
  const current = getCurrent();
  if (!current) {
    showToast('No hay usuario logueado');
    return;
  }
  
  if (!confirm(`¿Eliminar cuenta "${current.username}"? Esta acción no se puede deshacer.`)) {
    return;
  }
  
  let users = loadUsers();
  users = users.filter(u => u.username !== current.username);
  saveUsers(users);
  clearCurrent();
  showLogin();
  showToast('Cuenta eliminada');
};

/* ============================================
   6. FUNCIONES DE UI (categorías, productos)
   ============================================ */
const renderCategories = () => {
  categoriesEl.innerHTML = '';
  
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category';
    btn.textContent = cat.name;
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => selectCategory(cat.id));
    categoriesEl.appendChild(btn);
  });
};

const selectCategory = (catId) => {
  productsEl.innerHTML = '';
  const list = PRODUCTS[catId] || [];
  
  // Marcar categoría activa
  Array.from(categoriesEl.children).forEach(btn => {
    const catName = CATEGORIES.find(c => c.id === catId)?.name || '';
    btn.classList.toggle('active', btn.textContent === catName);
    btn.setAttribute('aria-selected', btn.textContent === catName);
  });
  
  if (list.length === 0) {
    productsEl.innerHTML = '<p class="muted">Sin productos en esta categoría</p>';
    return;
  }
  
  list.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Badge (HOT SALE, NUEVO, etc.)
    const badge = document.createElement('div');
    badge.className = 'product-badge';
    badge.textContent = product.badge || 'POPULAR';
    
    // Añadir clase específica según el tipo de badge
    if (product.badge) {
      const badgeClass = product.badge.toLowerCase().replace(/ /g, '-');
      badge.classList.add(`badge-${badgeClass}`);
    }
    
    // Imagen wrapper
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'product-image-wrapper';
    
    if (product.image) {
      const img = document.createElement('img');
      img.src = product.image;
      img.alt = product.name;
      img.loading = 'lazy';
      imgWrapper.appendChild(img);
    } else {
      const img = document.createElement('div');
      img.className = 'product-image';
      img.style.fontSize = '48px';
      img.textContent = '☕';
      imgWrapper.appendChild(img);
    }
    
    // Info section
    const info = document.createElement('div');
    info.className = 'product-info';
    
    // Categoría
    const category = document.createElement('div');
    category.className = 'product-category';
    category.textContent = product.category || 'Bebida caliente';
    
    // Título
    const title = document.createElement('h4');
    title.textContent = product.name;
    
    // Descripción
    const desc = document.createElement('p');
    desc.className = 'product-desc';
    desc.textContent = product.description || 'Deliciosa bebida preparada con ingredientes de primera calidad.';
    
    // Features
    const features = document.createElement('div');
    features.className = 'product-features';
    const featuresList = product.features || ['Caliente', 'Recién hecho', 'Premium'];
    featuresList.forEach(feat => {
      const span = document.createElement('span');
      span.className = 'product-feature';
      span.textContent = feat;
      features.appendChild(span);
    });
    
    // Bottom: precio + botón
    const bottom = document.createElement('div');
    bottom.className = 'card-bottom';
    
    const priceContainer = document.createElement('div');
    priceContainer.className = 'price';
    
    const oldPrice = product.oldPrice || (product.price * 1.2).toFixed(2);
    const priceOld = document.createElement('span');
    priceOld.className = 'price-old';
    priceOld.textContent = `${oldPrice} €`;
    
    const priceNew = document.createElement('span');
    priceNew.className = 'price-new';
    priceNew.textContent = `${product.price.toFixed(2)} €`;
    
    priceContainer.appendChild(priceOld);
    priceContainer.appendChild(priceNew);
    
    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.textContent = '+';
    addBtn.setAttribute('aria-label', `Añadir ${product.name} al carrito`);
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openProductDrawer(product);
    });
    
    bottom.appendChild(priceContainer);
    bottom.appendChild(addBtn);
    
    // Meta: rating + stock
    const meta = document.createElement('div');
    meta.className = 'product-meta';
    
    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'product-rating';
    ratingDiv.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" stroke-width="0.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" stroke-width="0.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" stroke-width="0.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" stroke-width="0.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" stroke-width="0.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      <span class="rating-count">4.8 (245)</span>
    `;
    
    const stock = document.createElement('div');
    stock.className = 'product-stock';
    stock.textContent = 'Disponible';
    
    meta.appendChild(ratingDiv);
    meta.appendChild(stock);
    
    // Verificar si el usuario tiene alergias y el producto contiene alérgenos
    const currentUser = getCurrent();
    const userAllergies = currentUser?.allergies || [];
    const productAllergens = product.allergens || [];
    
    const hasAllergen = userAllergies.some(allergy => productAllergens.includes(allergy));
    
    if (hasAllergen) {
      const allergenWarning = document.createElement('div');
      allergenWarning.className = 'allergen-warning';
      allergenWarning.innerHTML = `
        <span class="allergen-icon">🚨</span>
        <span class="allergen-text">Contiene alérgeno</span>
      `;
      meta.appendChild(allergenWarning);
      
      // Añadir badge de alérgeno en la imagen
      const allergenBadge = document.createElement('div');
      allergenBadge.className = 'allergen-badge';
      allergenBadge.innerHTML = '🚨 Alérgeno';
      imgWrapper.appendChild(allergenBadge);
      
      // Añadir clase de advertencia a la tarjeta
      card.classList.add('has-allergen');
    }
    
    // Ensamblar info
    info.appendChild(category);
    info.appendChild(title);
    info.appendChild(desc);
    info.appendChild(features);
    info.appendChild(bottom);
    info.appendChild(meta);
    
    // Ensamblar card
    card.appendChild(badge);
    card.appendChild(imgWrapper);
    card.appendChild(info);
    
    productsEl.appendChild(card);
  });
};

/* ============================================
   7. DRAWER DE PRODUCTO Y CARRITO
   ============================================ */
const openProductDrawer = (product) => {
  selectedProduct = product;
  currentOptions = { extras: {}, removals: [], quantity: 1 };
  
  // Actualizar header con título
  drawerTitle.textContent = product.name;
  
  // Actualizar imagen de fondo del header
  const drawerHeader = document.querySelector('.drawer-header');
  if (drawerHeader) {
    if (product.image) {
      drawerHeader.style.backgroundImage = `url('${product.image}')`;
      drawerHeader.style.backgroundColor = '';
    } else {
      drawerHeader.style.backgroundImage = '';
      drawerHeader.style.backgroundColor = '#f0f0f0';
    }
  }
  
  // Limpiar y construir body
  drawerBody.innerHTML = '';
  
  // Precio y descripción
  const priceDesc = document.createElement('div');
  priceDesc.innerHTML = `
    <div class="drawer-product-price">${product.price.toFixed(2)} €</div>
    <div class="drawer-product-desc">${product.description || ''}</div>
  `;
  drawerBody.appendChild(priceDesc);
  
  // Sección de Complementos & Extras (solo si hay extras)
  if (product.extras && product.extras.length) {
    const extrasSection = document.createElement('div');
    extrasSection.className = 'drawer-section';
    
    // Título dinámico basado en la cantidad de extras
    let sectionTitle = 'Opciones de Personalización';
    let sectionSubtitle = '';
    
    if (product.extras.length > 1) {
      sectionTitle = 'Complementos & Extras';
      sectionSubtitle = '<div class="drawer-section-subtitle">Elige entre 1 y 100 productos</div>';
    }
    
    extrasSection.innerHTML = `
      <div class="drawer-section-title">
        <span>✓</span>
        <span>${sectionTitle}</span>
      </div>
      ${sectionSubtitle}
    `;
    
    product.extras.forEach(ex => {
      currentOptions.extras[ex.id] = 0;
      
      const option = document.createElement('div');
      option.className = 'drawer-option';
      
      const optionInfo = document.createElement('div');
      optionInfo.className = 'drawer-option-info';
      optionInfo.innerHTML = `
        <div class="drawer-option-name">${ex.name}</div>
        <div class="drawer-option-price">+0,10 €</div>
      `;
      
      const control = document.createElement('div');
      control.className = 'drawer-option-control';
      
      const qtyControl = document.createElement('div');
      qtyControl.className = 'quantity-control';
      qtyControl.innerHTML = `
        <button type="button" class="quantity-btn" data-extra="${ex.id}" data-action="minus" aria-label="Reducir cantidad">−</button>
        <span class="quantity-value" data-extra="${ex.id}">0</span>
        <button type="button" class="quantity-btn" data-extra="${ex.id}" data-action="plus" aria-label="Aumentar cantidad">+</button>
      `;
      
      control.appendChild(qtyControl);
      option.appendChild(optionInfo);
      option.appendChild(control);
      extrasSection.appendChild(option);
    });
    
    drawerBody.appendChild(extrasSection);
    
    // Event listeners para controles de cantidad
    drawerBody.querySelectorAll('.quantity-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const extraId = e.target.dataset.extra;
        const action = e.target.dataset.action;
        const valueSpan = drawerBody.querySelector(`.quantity-value[data-extra="${extraId}"]`);
        
        let currentValue = currentOptions.extras[extraId] || 0;
        
        if (action === 'plus') {
          currentValue = Math.min(100, currentValue + 1);
        } else if (action === 'minus') {
          currentValue = Math.max(0, currentValue - 1);
        }
        
        currentOptions.extras[extraId] = currentValue;
        valueSpan.textContent = currentValue;
        updateDrawerPrice();
        
        // Deshabilitar botón menos si es 0
        const minusBtn = btn.parentElement.querySelector('[data-action="minus"]');
        if (minusBtn) {
          minusBtn.disabled = currentValue === 0;
        }
      });
    });
  }
  
  // Sección de ingredientes removibles
  if (product.removables && product.removables.length) {
    const removablesSection = document.createElement('div');
    removablesSection.className = 'drawer-section';
    removablesSection.innerHTML = `
      <div class="drawer-section-title">
        <span>−</span>
        <span>Quitar ingredientes</span>
      </div>
    `;
    
    product.removables.forEach(item => {
      const option = document.createElement('div');
      option.className = 'drawer-option';
      
      const optionInfo = document.createElement('div');
      optionInfo.className = 'drawer-option-info';
      optionInfo.innerHTML = `<div class="drawer-option-name">${item}</div>`;
      
      const checkbox = document.createElement('div');
      checkbox.className = 'custom-checkbox';
      checkbox.dataset.item = item;
      checkbox.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      checkbox.addEventListener('click', () => {
        checkbox.classList.toggle('checked');
        if (checkbox.classList.contains('checked')) {
          currentOptions.removals.push(item);
        } else {
          currentOptions.removals = currentOptions.removals.filter(x => x !== item);
        }
      });
      
      option.appendChild(optionInfo);
      option.appendChild(checkbox);
      removablesSection.appendChild(option);
    });
    
    drawerBody.appendChild(removablesSection);
  }
  
  // Actualizar footer button
  const footerBtn = document.getElementById('add-to-cart-btn');
  if (footerBtn) {
    footerBtn.className = 'drawer-footer-btn';
    footerBtn.innerHTML = `
      <span class="drawer-footer-btn-text">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <span style="margin-right: 12px;">Añadir</span>
        <span class="quantity-control">
          <button type="button" class="quantity-btn" id="footer-qty-minus">−</button>
          <span class="quantity-value" id="footer-qty-value">1</span>
          <button type="button" class="quantity-btn" id="footer-qty-plus">+</button>
        </span>
      </span>
      <span class="drawer-footer-btn-price" id="footer-total-price">${product.price.toFixed(2)} €</span>
    `;
    
    // Event listeners para cantidad en footer
    document.getElementById('footer-qty-minus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentOptions.quantity > 1) {
        currentOptions.quantity--;
        document.getElementById('footer-qty-value').textContent = currentOptions.quantity;
        updateDrawerPrice();
      }
    });
    
    document.getElementById('footer-qty-plus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      currentOptions.quantity++;
      document.getElementById('footer-qty-value').textContent = currentOptions.quantity;
      updateDrawerPrice();
    });
  }
  
  updateDrawerPrice();
  productDrawer.classList.remove('hidden');
  productDrawer.setAttribute('aria-hidden', 'false');
  overlayShow();
};

const updateDrawerPrice = () => {
  let price = selectedProduct?.price || 0;
  
  // Calcular extras (por ejemplo azúcar +0.10€ por unidad)
  if (selectedProduct && selectedProduct.extras) {
    selectedProduct.extras.forEach(ex => {
      const value = currentOptions.extras[ex.id] || 0;
      if (ex.id === 'sugar') {
        price += 0.1 * value;
      }
    });
  }
  
  const qty = currentOptions.quantity || 1;
  const totalPrice = (price * qty).toFixed(2) + ' €';
  
  // Actualizar precio en footer
  const footerPrice = document.getElementById('footer-total-price');
  if (footerPrice) {
    footerPrice.textContent = totalPrice;
  }
  
  // Actualizar precio antiguo si existe
  const oldPriceEl = document.getElementById('drawer-price');
  if (oldPriceEl) {
    oldPriceEl.textContent = totalPrice;
  }
};

const closeProductDrawer = () => {
  productDrawer.classList.add('hidden');
  productDrawer.setAttribute('aria-hidden', 'true');
  overlayHide();
};

const addToCart = () => {
  if (!selectedProduct) return;
  
  const cart = loadCart();
  const item = {
    id: Date.now().toString(),
    productId: selectedProduct.id,
    name: selectedProduct.name,
    price: selectedProduct.price,
    options: JSON.parse(JSON.stringify(currentOptions))
  };
  
  cart.push(item);
  saveCart(cart);
  closeProductDrawer();
  renderCart();
  showToast('✓ Añadido al carrito');
};

const renderCart = () => {
  const cart = loadCart();
  
  // Actualizar badge del carrito
  updateCartBadge();
  
  if (!cart.length) {
    cartBody.innerHTML = '<p class="muted">Carrito vacío</p>';
    cartTotalAmount.textContent = '0.00 €';
    return;
  }
  
  cartBody.innerHTML = '';
  let total = 0;
  
  cart.forEach(item => {
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.padding = '12px';
    el.style.borderRadius = '8px';
    el.style.border = '1px solid #eee';
    el.style.marginBottom = '8px';
    
    // Calcular precio del item
    let itemPrice = item.price;
    if (item.options.extras?.sugar) {
      itemPrice += 0.1 * item.options.extras.sugar;
    }
    
    const qty = item.options.quantity || 1;
    const totalItemPrice = itemPrice * qty;
    total += totalItemPrice;
    
    // Opciones legibles
    let opts = '';
    if (item.options.removals && item.options.removals.length) {
      opts += 'Sin: ' + item.options.removals.join(', ');
    }
    if (item.options.extras?.sugar) {
      opts += (opts ? ' • ' : '') + `Azúcar x${item.options.extras.sugar}`;
    }
    
    el.innerHTML = `
      <div>
        <div style="font-weight: 700; margin-bottom: 4px;">${item.name} (x${qty})</div>
        <div class="muted" style="font-size: 12px;">${opts}</div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
        <div class="price">${totalItemPrice.toFixed(2)} €</div>
        <button class="btn btn-outline btn-sm" data-item-id="${item.id}" onclick="removeFromCart('${item.id}')">
          Eliminar
        </button>
      </div>
    `;
    
    cartBody.appendChild(el);
  });
  
  cartTotalAmount.textContent = total.toFixed(2) + ' €';
};

window.removeFromCart = (id) => {
  let cart = loadCart();
  cart = cart.filter(x => x.id !== id);
  saveCart(cart);
  renderCart();
  showToast('Producto eliminado');
};

const openCartModal = () => {
  cartModal.classList.remove('hidden');
  cartModal.setAttribute('aria-hidden', 'false');
  overlayShow();
  renderCart();
};

const closeCartModal = () => {
  cartModal.classList.add('hidden');
  cartModal.setAttribute('aria-hidden', 'true');
  overlayHide();
};

const clearCartConfirm = () => {
  if (confirm('¿Vaciar el carrito?')) {
    clearCart();
    renderCart();
    showToast('Carrito vaciado');
  }
};

const payOrder = () => {
  const cart = loadCart();
  if (!cart.length) {
    showToast('El carrito está vacío');
    return;
  }
  
  // Crear el pedido
  const orderId = 'ORD' + Date.now().toString().slice(-8);
  const now = new Date();
  
  const order = {
    id: orderId,
    date: now.toISOString(),
    status: 'Entregado',
    items: cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.options.quantity || 1,
      options: item.options
    })),
    total: cart.reduce((sum, item) => {
      const price = item.price || 0;
      const qty = item.options.quantity || 1;
      return sum + (price * qty);
    }, 0),
    paymentMethod: 'Tarjeta de crédito'
  };
  
  // Guardar pedido
  saveOrder(order);
  
  // Limpiar carrito
  clearCart();
  renderCart();
  updateCartBadge();
  closeCartModal();
  
  // Mostrar confirmación
  showOrderConfirmation(order);
};

/**
 * Actualizar el badge del carrito con el número de artículos
 */
const updateCartBadge = () => {
  const cart = loadCart();
  const totalItems = cart.reduce((sum, item) => sum + (item.options.quantity || 1), 0);
  
  if (totalItems > 0) {
    cartBadge.textContent = totalItems;
    cartBadge.classList.remove('hidden');
  } else {
    cartBadge.classList.add('hidden');
  }
};

/* ============================================
   8. OVERLAY Y TOAST
   ============================================ */
const overlayShow = () => {
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
};

const overlayHide = () => {
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
};

const showToast = (message, duration = 1600) => {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, duration);
};

/* ============================================
   9. GESTIÓN DE PEDIDOS
   ============================================ */
const showOrderConfirmation = (order) => {
  // Ocultar pantalla principal
  mainScreen.classList.add('hidden');
  
  // Mostrar pantalla de confirmación
  orderConfirmationScreen.classList.remove('hidden');
  
  // Establecer imagen de fondo
  const heroEl = document.querySelector('.order-hero');
  heroEl.style.backgroundImage = `url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80')`;
  
  // Formatear fecha
  const date = new Date(order.date);
  const formattedDate = date.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'long', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // Actualizar contenido
  document.querySelector('.order-date').textContent = formattedDate;
  document.querySelector('.order-id').textContent = `Pedido ${order.id}`;
  
  // Renderizar items
  const orderItemsList = document.querySelector('.order-items-list');
  orderItemsList.innerHTML = '';
  
  order.items.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'order-item';
    
    let details = '';
    if (item.options.removals && item.options.removals.length) {
      details = 'Sin: ' + item.options.removals.join(', ');
    }
    if (item.options.extras?.sugar) {
      details += (details ? ' • ' : '') + `Azúcar x${item.options.extras.sugar}`;
    }
    
    itemEl.innerHTML = `
      <div class="order-item-info">
        <p class="order-item-name"><span class="order-item-qty">${item.quantity}x</span> ${item.name}</p>
        ${details ? `<p class="order-item-details">${details}</p>` : ''}
      </div>
      <div class="order-item-price">${(item.price * item.quantity).toFixed(2)} €</div>
    `;
    
    orderItemsList.appendChild(itemEl);
  });
  
  // Actualizar resumen
  const subtotal = order.total;
  const services = 0;
  const total = subtotal + services;
  
  document.querySelector('.summary-row:nth-child(1) .summary-value').textContent = `${subtotal.toFixed(2)} €`;
  document.querySelector('.summary-row:nth-child(2) .summary-value').textContent = `${services.toFixed(2)} €`;
  document.querySelector('.summary-row.total .summary-value').textContent = `${total.toFixed(2)} €`;
};

const closeOrderConfirmation = () => {
  orderConfirmationScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  overlayHide();
};

const openOrderHistory = () => {
  // Ocultar pantalla principal
  mainScreen.classList.add('hidden');
  
  // Mostrar pantalla de historial
  ordersHistoryScreen.classList.remove('hidden');
  
  // Renderizar pedidos
  renderOrderHistory();
};

const closeOrderHistory = () => {
  ordersHistoryScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
};

const renderOrderHistory = () => {
  const orders = loadOrders();
  historyContent.innerHTML = '';
  
  if (orders.length === 0) {
    historyContent.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
        <p>No tienes pedidos aún</p>
      </div>
    `;
    return;
  }
  
  orders.forEach(order => {
    const date = new Date(order.date);
    const formattedDate = date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const itemsText = order.items.length === 1 
      ? '1 producto' 
      : `${order.items.length} productos`;
    
    const cardEl = document.createElement('div');
    cardEl.className = 'history-order-card';
    cardEl.innerHTML = `
      <div class="history-order-header">
        <div class="history-order-info">
          <h4>Cafetería SSG</h4>
          <p class="history-order-date">${formattedDate}</p>
        </div>
        <div class="history-order-status">${order.status}</div>
      </div>
      <p class="history-order-items">${itemsText}</p>
      <div class="history-order-footer">
        <div class="history-order-total">${order.total.toFixed(2)} €</div>
        <div class="history-order-arrow">›</div>
      </div>
    `;
    
    // Click para ver detalles
    cardEl.addEventListener('click', () => {
      showOrderConfirmation(order);
      ordersHistoryScreen.classList.add('hidden');
    });
    
    historyContent.appendChild(cardEl);
  });
};

/* ============================================
   9. EVENT LISTENERS
   ============================================ */
const attachEventListeners = () => {
  // Login y autenticación
  loginForm.addEventListener('submit', handleLogin);
  signupBtn.addEventListener('click', handleSignup);
  logoutBtn.addEventListener('click', handleLogout);
  deleteAccountBtn?.addEventListener('click', handleDeleteAccount);
  
  // Menú lateral
  hamburger.addEventListener('click', () => {
    sideMenu.classList.toggle('hidden');
    const isHidden = sideMenu.classList.contains('hidden');
    sideMenu.setAttribute('aria-hidden', isHidden);
    hamburger.setAttribute('aria-expanded', !isHidden);
    
    if (!isHidden) {
      overlayShow();
    } else {
      overlayHide();
    }
  });
  
  // Drawer de producto
  drawerClose.addEventListener('click', closeProductDrawer);
  addToCartBtn.addEventListener('click', addToCart);
  
  // Carrito
  navCart.addEventListener('click', openCartModal);
  closeCartBtn.addEventListener('click', closeCartModal);
  clearCartBtn.addEventListener('click', clearCartConfirm);
  payBtn.addEventListener('click', payOrder);
  
  // Bottom nav
  navHome.addEventListener('click', () => {
    showToast('Promociones - próximamente');
  });
  
  navHistory.addEventListener('click', openOrderHistory);
  
  navFavorites?.addEventListener('click', () => {
    showToast('Favoritos - próximamente');
  });
  
  navProfile?.addEventListener('click', () => {
    showToast('Perfil - próximamente');
  });
  
  // Filtros
  filterBtn?.addEventListener('click', () => {
    showToast('Filtros avanzados - próximamente');
  });
  
  // Logout desde menú lateral
  logoutMenuBtn?.addEventListener('click', handleLogout);
  
  // Pantallas de pedidos
  orderBackBtn?.addEventListener('click', closeOrderConfirmation);
  historyBackBtn?.addEventListener('click', closeOrderHistory);
  
  // Overlay: cerrar al hacer clic
  overlay.addEventListener('click', () => {
    closeProductDrawer();
    closeCartModal();
    sideMenu.classList.add('hidden');
    sideMenu.setAttribute('aria-hidden', 'true');
    overlayHide();
  });
};

/* ============================================
   10. INICIALIZACIÓN
   ============================================ */
const init = () => {
  // Crear o actualizar usuario demo con alergias
  const users = loadUsers();
  const demoUserIndex = users.findIndex(u => u.username === 'demo');
  
  if (demoUserIndex === -1) {
    // Crear nuevo usuario demo
    users.push({ 
      username: 'demo', 
      password: 'demo',
      allergies: ['lacteos']
    });
  } else {
    // Actualizar usuario demo existente con alergias
    users[demoUserIndex].allergies = ['lacteos'];
  }
  saveUsers(users);
  
  // Si el usuario actual es demo, actualizar su sesión también
  const current = getCurrent();
  if (current && current.username === 'demo') {
    current.allergies = ['lacteos'];
    setCurrent(current);
  }
  
  // Comprobar si hay usuario logueado
  if (current) {
    showMain();
  } else {
    showLogin();
  }
  
  // Renderizar categorías y seleccionar la primera
  renderCategories();
  if (CATEGORIES.length) {
    selectCategory(CATEGORIES[0].id);
  }
  
  // Renderizar carrito inicial
  renderCart();
  
  // Actualizar badge del carrito
  updateCartBadge();
  
  // Adjuntar event listeners
  attachEventListeners();
  
  console.log('✅ CafeteriaApp mockup inicializado');
};

// Iniciar aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Depuración: Mostrar errores en consola
window.addEventListener('error', (e) => {
  console.error('Error global:', e.error);
  console.error('Mensaje:', e.message);
  console.error('Archivo:', e.filename);
  console.error('Línea:', e.lineno);
});
