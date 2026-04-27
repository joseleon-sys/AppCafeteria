import { crearAuthTokenService } from '../services/authTokenService.js';
import { crearAuthNotificationFlows } from './auth.notificationFlows.js';
import { crearAuthProfileFlows } from './auth.profileFlows.js';
import { crearAuthSecurityLogger } from './auth.security.js';
import { crearAuthSessionFlows } from './auth.sessionFlows.js';
import { crearAuthUserFlows } from './auth.userFlows.js';

export function crearAuthService(deps, repository) {
  const tokenService = crearAuthTokenService({ jwtSecret: deps.JWT_SECRET });
  const securityLogger = crearAuthSecurityLogger({
    supabase: deps.supabase,
    logSecurityEvent: deps.logSecurityEvent,
  });

  const flowDeps = { deps, repository, tokenService, securityLogger };

  return {
    registrarErrorRegistro: securityLogger.registrarErrorRegistro,
    registrarErrorLogin: securityLogger.registrarErrorLogin,
    registrarErrorRestablecerContrasena: securityLogger.registrarErrorRestablecerContrasena,
    ...crearAuthUserFlows(flowDeps),
    ...crearAuthSessionFlows(flowDeps),
    ...crearAuthNotificationFlows(flowDeps),
    ...crearAuthProfileFlows(flowDeps),
  };
}
