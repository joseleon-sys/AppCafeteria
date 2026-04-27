import jwt from 'jsonwebtoken';
import { Sentry, isSentryEnabled } from '../observability/sentry.js';
import { AppError } from '../shared/errors/AppError.js';

export const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  PARENT: 'parent',
  CHILD: 'child',
});

function normalizarRoles(roles) {
  return Array.isArray(roles) ? roles : [roles];
}

function tieneUsuarioAutenticado(req) {
  return Boolean(req.user?.id);
}

export function puedeActuarComoPadre(user) {
  return Boolean(user && user.role !== USER_ROLES.CHILD);
}

export function createRequireAuth({ jwtSecret }) {
  return function requireAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    const [scheme, token] = String(authHeader || '').split(' ');

    if (scheme !== 'Bearer' || !token) {
      return next(new AppError('Token no proporcionado', 401));
    }

    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) return next(new AppError('Token inválido', 403));

      req.user = user;
      if (isSentryEnabled() && user?.id) {
        Sentry.setUser({ id: String(user.id), role: user.role });
      }

      return next();
    });
  };
}

export function requireRole(role) {
  return requireAnyRole([role]);
}

export function requireAnyRole(roles) {
  const allowedRoles = normalizarRoles(roles);

  return function requireAnyRoleMiddleware(req, _res, next) {
    if (!tieneUsuarioAutenticado(req)) {
      return next(new AppError('Usuario autenticado requerido', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Acceso denegado', 403));
    }

    return next();
  };
}

export function requireAdultUser(req, _res, next) {
  if (!tieneUsuarioAutenticado(req)) {
    return next(new AppError('Usuario autenticado requerido', 401));
  }

  const hasMinorFlag = req.user.isAdult === false || req.user.is_adult === false;
  if (!puedeActuarComoPadre(req.user) || hasMinorFlag) {
    return next(new AppError('Acceso denegado: solo usuarios adultos', 403));
  }

  return next();
}

export function requireAdmin(req, res, next) {
  return requireRole(USER_ROLES.ADMIN)(req, res, next);
}
