// Este archivo prepara el "contexto" comun del backend:
// configuracion, cliente de base de datos, middlewares, helpers y utilidades compartidas.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import {
  loginRateLimiter,
  registrationRateLimiter,
  linkingRateLimiter,
  resetLoginAttempts,
  getClientIP,
} from './middleware/rateLimiter.js';
import {
  logSecurityEvent,
  calculateTrustScore,
  requireTrustScore,
  validateLinkingLimits,
} from './middleware/fraudPrevention.js';
import {
  registrarTokenDispositivo,
  desactivarTokenDispositivo,
  listarNotificacionesUsuario,
  marcarNotificacionComoLeida,
  enviarPushAUsuario,
} from './services/notificationService.js';
import { Sentry, captureServerResponse, initSentry, isSentryEnabled } from './observability/sentry.js';
import { createHttpLogger } from './observability/httpLogger.js';
import {
  utilidadesApp,
  construirNotasLineaPedido,
  tieneFormatoUuid,
  normalizarCodigoEspecial,
  parsearValorBooleano,
  transformarProducto,
} from './utils/utilidadesApp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env'), override: false });

function esDespliegueAlojado() {
  // Detecta si estamos corriendo en una plataforma alojada como Railway.
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_STATIC_URL,
  );
}

function estaActivoSaltoPagoDesarrollo({
  isProduction = process.env.NODE_ENV === 'production',
  isHosted = esDespliegueAlojado(),
} = {}) {
  // El bypass de pago solo se permite en entornos locales de desarrollo.
  if (isProduction || isHosted) {
    return false;
  }

  return parsearValorBooleano(process.env.DEV_BYPASS_STRIPE_PAYMENT, false);
}


export function crearContextoApp() {
  // Inicializa observabilidad lo antes posible para capturar errores desde el arranque.
  initSentry();

  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';
  const isHosted = esDespliegueAlojado();
  const JWT_SECRET = process.env.JWT_SECRET || (!isProduction ? randomBytes(32).toString('hex') : null);

  if (!process.env.JWT_SECRET) {
    if (isProduction) throw new Error('JWT_SECRET es obligatorio en producción');
    console.warn('JWT_SECRET no configurado. Se usa una clave temporal de desarrollo.');
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseServerKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseServerKey) {
    throw new Error('SUPABASE_URL y SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY son obligatorios');
  }

  // Cliente principal de acceso a datos.
  const supabase = createClient(supabaseUrl, supabaseServerKey);
  const bypassRequestedInDisabledEnvironment = (isProduction || isHosted) && parsearValorBooleano(process.env.DEV_BYPASS_STRIPE_PAYMENT, false);
  const developmentPaymentBypassEnabled = estaActivoSaltoPagoDesarrollo({ isProduction, isHosted });
  const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();

  if (bypassRequestedInDisabledEnvironment) {
    console.warn('DEV_BYPASS_STRIPE_PAYMENT esta activo en produccion/Railway, pero se ignorara para no saltar Stripe.');
  }

  if (!stripeSecretKey) {
    if ((isProduction || isHosted) && !developmentPaymentBypassEnabled) {
      throw new Error('STRIPE_SECRET_KEY es obligatorio en produccion/Railway para no saltar la pasarela de pago');
    }
    console.warn('STRIPE_SECRET_KEY no configurado. Stripe quedara deshabilitado hasta definir la clave.');
  }

  const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

  console.log('Supabase configurado. Se usara como unico origen de datos.');

  // Middleware globales basicos.
  app.use(cors());
  app.use(express.json());
  app.use(createHttpLogger());
  app.use((req, res, next) => {
    // Cuando la respuesta termina, enviamos una copia resumida a Sentry si hubo error grave.
    res.on('finish', () => captureServerResponse(req, res));
    next();
  });
  app.use((req, res, next) => {
    // Dejamos el cliente Supabase accesible desde la request por comodidad.
    req.supabase = supabase;
    next();
  });

  function autenticarToken(req, res, next) {
    // Middleware JWT: extrae el token, lo valida y guarda el usuario en req.user.
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token no proporcionado' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Token inválido' });
      req.user = user;
      if (isSentryEnabled() && user?.id) {
        Sentry.setUser({ id: String(user.id), role: user.role });
      }
      next();
    });
  }

  function puedeActuarComoPadre(user) {
    // Regla de negocio actual: cualquier usuario que no sea "child" puede actuar como padre.
    if (!user) return false;
    return user.role !== 'child';
  }

  function requireAdmin(req, res, next) {
    // Limita una ruta solo a usuarios con rol admin.
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: solo administradores' });
    }
    next();
  }

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

  async function iniciarServidor() {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);

      void (async () => {
        try {
          const productSummary = await obtenerResumenProductosActivos();
          console.log(`Productos disponibles (${productSummary.source}): ${productSummary.count}`);
        } catch (error) {
          console.error('No se pudo obtener el resumen inicial de productos:', error);
        }
      })();
    });
  }

  return {
    app,
    PORT,
    JWT_SECRET,
    supabase,
    stripe,
    developmentPaymentBypassEnabled,
    autenticarToken,
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
