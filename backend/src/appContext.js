// Este archivo prepara el "contexto" comun del backend:
// dependencias, helpers de dominio y utilidades compartidas.
import { randomBytes } from 'crypto';
import { createRuntimeConfig, loadEnvironment } from './config/env.js';
import { createSupabaseClient } from './config/supabase.js';
import { createStripeConfig } from './config/stripe.js';
import { createExpressApp } from './app/expressApp.js';
import { createServerLifecycle } from './app/serverLifecycle.js';
import {
  createRequireAuth,
  puedeActuarComoPadre,
  requireAdmin,
  requireAdultUser,
  requireAnyRole,
  requireRole,
  USER_ROLES,
} from './middlewares/auth.middleware.js';
import {
  loginRateLimiter,
  registrationRateLimiter,
  linkingRateLimiter,
  resetLoginAttempts,
  getClientIP,
} from './middlewares/rateLimiter.js';
import {
  logSecurityEvent,
  calculateTrustScore,
  requireTrustScore,
  validateLinkingLimits,
} from './middlewares/fraudPrevention.js';
import {
  registrarTokenDispositivo,
  desactivarTokenDispositivo,
  listarNotificacionesUsuario,
  marcarNotificacionComoLeida,
  enviarPushAUsuario,
} from './services/notificationService.js';
import { crearTicketPrinterService } from './services/ticketPrinterService.js';
import { initSentry, isSentryEnabled } from './observability/sentry.js';
import {
  utilidadesApp,
  construirNotasLineaPedido,
  tieneFormatoUuid,
  normalizarCodigoEspecial,
  transformarProducto,
} from './utils/utilidadesApp.js';

export function crearContextoApp() {
  // Inicializa observabilidad lo antes posible para capturar errores desde el arranque.
  loadEnvironment();
  initSentry();

  const { port: PORT, isProduction, isHosted, jwtSecret: JWT_SECRET } = createRuntimeConfig();
  const supabase = createSupabaseClient();
  const { stripe, developmentPaymentBypassEnabled } = createStripeConfig({ isProduction, isHosted });
  const ticketPrinterService = crearTicketPrinterService({ supabase });
  const app = createExpressApp({ supabase, isHosted, isProduction });

  const requireAuth = createRequireAuth({ jwtSecret: JWT_SECRET });
  const autenticarToken = requireAuth;

  async function notificarUsuarioSinFallo(idUsuario, payload) {
    // Envia notificacion, pero sin romper el flujo principal si falla el push.
    if (!idUsuario || !supabase) return;
    try {
      await enviarPushAUsuario(supabase, { idUsuario, ...payload });
    } catch (error) {
      console.error(`Error enviando notificacion a user ${idUsuario}:`, error);
    }
  }

  async function obtenerModoEspecialUsuario(idUsuario) {
    // Lee si el usuario tiene activado un codigo especial en su perfil.
    if (!idUsuario) return { enabled: false, code: null };
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_adult, special_code')
        .eq('id', idUsuario)
        .single();

      if (error) {
        if (error.message?.toLowerCase().includes('special_code')) return { enabled: false, code: null };
        throw error;
      }

      const code = normalizarCodigoEspecial(data?.special_code);
      return { enabled: Boolean(data?.is_adult && code === 'ayuda'), code };
    } catch (error) {
      console.error('Error al comprobar el modo especial del usuario:', error);
      return { enabled: false, code: null };
    }
  }

  async function buscarUsuarioAuthPorEmail(email) {
    // Busca un usuario dentro del sistema Auth de Supabase recorriendo paginas.
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return null;

    const perPage = 200;
    for (let page = 1; page <= 25; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      const users = Array.isArray(data?.users) ? data.users : [];
      const match = users.find((user) => String(user?.email || '').trim().toLowerCase() === normalizedEmail);
      if (match) return match;
      if (users.length < perPage) break;
    }

    return null;
  }

  async function asegurarPerfilParaUsuarioApp(appUser, options = {}) {
    // Garantiza que exista el usuario equivalente en Supabase Auth y devuelve su profileId.
    if (!supabase) {
      const error = new Error('Supabase no esta configurado en el backend');
      error.statusCode = 503;
      throw error;
    }

    if (!appUser?.email) {
      const error = new Error('No se puede resolver el perfil del usuario sin email');
      error.statusCode = 400;
      throw error;
    }

    let authUser = await buscarUsuarioAuthPorEmail(appUser.email);

    if (!authUser) {
      const generatedPassword = options.password || randomBytes(24).toString('hex');
      const { data, error } = await supabase.auth.admin.createUser({
        email: appUser.email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          legacy_user_id: appUser.id ?? null,
          role: appUser.role ?? null,
          is_adult: Boolean(appUser.is_adult),
          full_name: appUser.nombre || null,
        },
      });

      if (error) {
        const maybeExistingUser = await buscarUsuarioAuthPorEmail(appUser.email);
        if (!maybeExistingUser) throw error;
        authUser = maybeExistingUser;
      } else {
        authUser = data?.user || null;
      }
    }

    if (!authUser?.id) {
      const error = new Error('No se pudo resolver el usuario auth de Supabase');
      error.statusCode = 500;
      throw error;
    }

    const { error: profileError } = await supabase
      .from('perfiles')
      .upsert({
        id: authUser.id,
        nombre_completo: appUser.nombre || null,
      }, { onConflict: 'id' });

    if (profileError) throw profileError;
    return authUser.id;
  }

  async function resolverIdPerfilParaUsuario(userLike, options = {}) {
    if (!supabase || !userLike) return null;

    if (tieneFormatoUuid(userLike.profileId)) return String(userLike.profileId);
    if (tieneFormatoUuid(userLike.id) && !userLike.email) return String(userLike.id);

    let appUser = null;
    if (userLike.email) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, nombre, role, is_adult')
        .eq('email', userLike.email)
        .maybeSingle();

      if (error) throw error;
      appUser = data;
    } else if (userLike.id !== undefined && userLike.id !== null) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, nombre, role, is_adult')
        .eq('id', userLike.id)
        .maybeSingle();

      if (error) throw error;
      appUser = data;
    }

    if (!appUser) return null;
    return asegurarPerfilParaUsuarioApp(appUser, options);
  }

  async function obtenerResumenProductosActivos() {
    const { data, count, error } = await supabase
      .from('productos_menu')
      .select('id', { count: 'exact' })
      .eq('activo', true);

    if (error) throw error;

    return {
      source: 'Supabase',
      count: Number.isFinite(count) ? count : (Array.isArray(data) ? data.length : 0),
    };
  }

  async function buscarProductoCatalogoPorId(productId) {
    const normalizedId = String(productId || '').trim();
    if (!normalizedId) return null;

    const { data, error } = await supabase.from('productos_menu').select('*').eq('id', normalizedId).single();
    if (error || !data) return null;
    return transformarProducto(data);
  }

  async function validarItemsPedido(items = [], options = {}) {
    const crearErrorValidacion = (message) => {
      const error = new Error(message);
      error.statusCode = 400;
      return error;
    };

    const userSpecialMode = options.idUsuario ? await obtenerModoEspecialUsuario(options.idUsuario) : { enabled: false, code: null };
    let subtotal = 0;
    const itemsValidados = [];

    for (const itemOriginal of items) {
      const productId = itemOriginal?.product_id;
      const quantity = Number.parseInt(itemOriginal?.quantity, 10);
      const normalizedProductId = String(productId || '').trim();

      if (!normalizedProductId) throw crearErrorValidacion('Producto invalido');
      if (Number.isNaN(quantity) || quantity <= 0 || quantity > 50) throw crearErrorValidacion('Cantidad invalida (1-50)');

      const product = await buscarProductoCatalogoPorId(normalizedProductId);
      if (!product) throw crearErrorValidacion(`Producto ${normalizedProductId} no encontrado`);
      if (!product.active) throw crearErrorValidacion(`Producto ${product.name} no esta disponible`);

      const alergenosProducto = Array.isArray(product.allergens) ? product.allergens : [];
      const tieneAlergenoAyuda = alergenosProducto.some((allergen) => String(allergen || '').trim().toLowerCase() === 'ayuda');
      if (userSpecialMode.enabled && !tieneAlergenoAyuda) {
        throw crearErrorValidacion(`Producto ${product.name} no disponible con el codigo especial`);
      }

      const precioUnitario = userSpecialMode.enabled ? 0 : (Number.parseFloat(product.price) || 0);
      const subtotalItem = precioUnitario * quantity;
      subtotal += subtotalItem;

      itemsValidados.push({
        product_id: product.id,
        product_name: product.name,
        quantity,
        price: precioUnitario,
        subtotal: subtotalItem,
        notes: construirNotasLineaPedido(itemOriginal),
        allergens: alergenosProducto,
      });
    }

    const tax = Number((subtotal * 0.05).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));
    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      total,
      items: itemsValidados,
    };
  }

  const iniciarServidor = createServerLifecycle({
    app,
    port: PORT,
    obtenerResumenProductosActivos,
  });

  return {
    app,
    PORT,
    JWT_SECRET,
    supabase,
    stripe,
    developmentPaymentBypassEnabled,
    ticketPrinterService,
    USER_ROLES,
    requireAuth,
    autenticarToken,
    requireRole,
    requireAnyRole,
    requireAdultUser,
    requireAdmin,
    puedeActuarComoPadre,
    notificarUsuarioSinFallo,
    obtenerResumenProductosActivos,
    buscarProductoCatalogoPorId,
    validarItemsPedido,
    asegurarPerfilParaUsuarioApp,
    resolverIdPerfilParaUsuario,
    iniciarServidor,
    loginRateLimiter,
    registrationRateLimiter,
    linkingRateLimiter,
    resetLoginAttempts,
    getClientIP,
    logSecurityEvent,
    calculateTrustScore,
    requireTrustScore,
    validateLinkingLimits,
    registrarTokenDispositivo,
    desactivarTokenDispositivo,
    listarNotificacionesUsuario,
    marcarNotificacionComoLeida,
    isSentryEnabled,
    ...utilidadesApp,
  };
}
