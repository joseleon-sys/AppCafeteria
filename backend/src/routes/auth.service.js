import bcrypt from 'bcryptjs';
import { restablecerContrasenaUsuario } from '../services/passwordResetService.js';
import { crearAuthTokenService } from '../services/authTokenService.js';
import { construirUsuarioPublico, registrarFalloValidacionAuth } from '../utils/utilidadesAuth.js';
import {
  validarIdNotificacion,
  validarLoginUsuario,
  validarPerfilUsuario,
  validarRegistroUsuario,
  validarTokenDispositivo,
} from './auth.validators.js';

class AuthServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function crearError(statusCode, message) {
  return new AuthServiceError(statusCode, message);
}

function tieneErrorColumna(error, columnName) {
  return error?.message?.toLowerCase().includes(columnName);
}

export function crearAuthService(deps, repository) {
  const {
    supabase,
    JWT_SECRET,
    resetLoginAttempts,
    getClientIP,
    logSecurityEvent,
    calculateTrustScore,
    normalizarCodigoEspecial,
    normalizarIdsFavoritos,
    parsearEnteroPositivo,
    formatearNombreCompleto,
    calcularEdad,
    asegurarPerfilParaUsuarioApp,
    resolverIdPerfilParaUsuario,
    generarTokenPadre,
    esNombreCompletoValido,
    normalizarAlias,
    esAliasValido,
    esCodigoEspecialValido,
  } = deps;

  function requireSupabase(message = 'Supabase no esta configurado en el backend') {
    if (!supabase) throw crearError(503, message);
  }

  function usuarioPublico(user, extraData = {}) {
    return construirUsuarioPublico(user, extraData);
  }

  const tokenService = crearAuthTokenService({ jwtSecret: JWT_SECRET });

  async function registrarErrorValidacion({ actionType, reason, email, req, severity }) {
    await registrarFalloValidacionAuth({ supabase, logSecurityEvent, actionType, reason, email, req, severity });
  }

  return {
    async registrarErrorRegistro(error, req) {
      if (!supabase || error.statusCode) return;
      await logSecurityEvent(supabase, {
        actionType: 'registration_error',
        severity: 'high',
        details: { error: error.message },
        req,
      });
    },

    async registrarErrorLogin(error, req) {
      if (!supabase || error.statusCode) return;
      await logSecurityEvent(supabase, {
        actionType: 'login_error',
        severity: 'high',
        details: { error: error.message },
        req,
      });
    },

    async registrarErrorRestablecerContrasena(error, req) {
      if (!supabase) return;
      await logSecurityEvent(supabase, {
        actionType: 'password_reset_failed',
        severity: error.statusCode && error.statusCode < 500 ? 'low' : 'high',
        details: { error: error.message, email: req.body?.email || null },
        req,
      });
    },

    async registrarUsuario(body, req) {
      requireSupabase();

      const { email, password, name, birthDate } = body;
      const formattedName = formatearNombreCompleto(name);
      const validation = validarRegistroUsuario({
        email,
        password,
        formattedName,
        birthDate,
        esNombreCompletoValido,
      });

      if (!validation.valid) {
        await registrarErrorValidacion({
          actionType: 'registration_failed_validation',
          reason: validation.reason,
          email,
          req,
        });
        throw crearError(validation.statusCode, validation.message);
      }

      const age = calcularEdad(birthDate);
      const isAdult = age >= 18;
      const role = isAdult ? 'customer' : 'child';
      const tokenPadre = isAdult ? generarTokenPadre() : null;
      const passwordHash = await bcrypt.hash(password, 10);

      const { data: datosUsuario, error } = await repository.crearUsuario({
        email,
        password_hash: passwordHash,
        nombre: formattedName,
        birth_date: birthDate,
        is_adult: isAdult,
        role,
        parent_token: tokenPadre,
      });

      if (error) {
        if (error.code === '23505') {
          await registrarErrorValidacion({
            actionType: 'registration_duplicate_email',
            reason: 'duplicate_email',
            email,
            req,
            severity: 'medium',
          });
          throw crearError(400, 'El email ya está registrado');
        }
        throw error;
      }

      if (!datosUsuario) throw crearError(500, 'Error al crear usuario');

      const profileId = await asegurarPerfilParaUsuarioApp(datosUsuario, { password });

      await logSecurityEvent(supabase, {
        idUsuario: datosUsuario.id,
        actionType: 'registration_success',
        severity: 'low',
        details: { email: datosUsuario.email, role: datosUsuario.role, isAdult: datosUsuario.is_adult },
        req,
      });

      const tokens = await tokenService.emitirTokens({
        user: datosUsuario,
        profileId,
        repository,
        req,
      });

      return {
        message: 'Usuario creado correctamente',
        ...tokens,
        user: usuarioPublico(datosUsuario, {
          profileId,
          specialCode: normalizarCodigoEspecial(datosUsuario.special_code),
        }),
      };
    },

    async loginUsuario(body, req) {
      requireSupabase();

      const { email, password } = body;
      const validation = validarLoginUsuario({ email, password });
      if (!validation.valid) throw crearError(validation.statusCode, validation.message);

      const clientIP = getClientIP(req);
      const { data: user, error } = await repository.buscarUsuarioActivoPorEmail(email);

      if (error && error.code !== 'PGRST116') throw error;

      if (!user) {
        await logSecurityEvent(supabase, {
          actionType: 'login_failed_user_not_found',
          severity: 'medium',
          details: { email },
          req,
        });
        throw crearError(401, 'Credenciales incorrectas');
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        await logSecurityEvent(supabase, {
          idUsuario: user.id,
          actionType: 'login_failed_wrong_password',
          severity: 'high',
          details: { email },
          req,
        });
        throw crearError(401, 'Credenciales incorrectas');
      }

      resetLoginAttempts(clientIP);
      await repository.actualizarUltimoLogin(user.id);

      const profileId = await asegurarPerfilParaUsuarioApp(user, { password });

      await logSecurityEvent(supabase, {
        idUsuario: user.id,
        actionType: 'login_success',
        severity: 'low',
        details: { email: user.email, role: user.role },
        req,
      });

      const tokens = await tokenService.emitirTokens({
        user,
        profileId,
        repository,
        req,
      });
      const trustScore = await calculateTrustScore(supabase, user.id, { profileId });

      return {
        ...tokens,
        user: usuarioPublico(user, {
          profileId,
          specialCode: normalizarCodigoEspecial(user.special_code),
          favorites: normalizarIdsFavoritos(user.favoritos),
          trustScore,
        }),
      };
    },

    async refrescarSesion(body, req) {
      requireSupabase();

      const refreshToken = String(body?.refreshToken || '').trim();
      if (!refreshToken) throw crearError(400, 'Refresh token requerido');

      const tokenHash = tokenService.hashearRefreshToken(refreshToken);
      const { data: storedToken, error: tokenError } = await repository.obtenerRefreshTokenActivo(tokenHash);

      if (tokenError) throw tokenError;
      if (!storedToken) throw crearError(401, 'Refresh token inválido');

      const expiresAt = new Date(storedToken.expires_at);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        await repository.revocarRefreshToken(tokenHash);
        throw crearError(401, 'Refresh token expirado');
      }

      const { data: user, error: userError } = await repository.buscarUsuarioPorId(storedToken.user_id);
      if (userError || !user || user.active === false) throw crearError(401, 'Usuario no disponible');

      const profileId = await resolverIdPerfilParaUsuario({
        id: user.id,
        email: user.email,
      });

      await repository.revocarRefreshToken(tokenHash);
      const tokens = await tokenService.emitirTokens({
        user,
        profileId,
        repository,
        req,
        reemplazaTokenHash: tokenHash,
      });

      return {
        ...tokens,
        user: usuarioPublico(user, {
          profileId,
          specialCode: normalizarCodigoEspecial(user.special_code),
          favorites: normalizarIdsFavoritos(user.favoritos),
        }),
      };
    },

    async cerrarSesion(body) {
      requireSupabase();

      const refreshToken = String(body?.refreshToken || '').trim();
      if (!refreshToken) return { message: 'Sesión cerrada' };

      await repository.revocarRefreshToken(tokenService.hashearRefreshToken(refreshToken));
      return { message: 'Sesión cerrada' };
    },

    async restablecerContrasena(body, req) {
      requireSupabase();

      const { email, birthDate, newPassword } = body;
      const resetResult = await restablecerContrasenaUsuario({ email, birthDate, newPassword, supabase });

      await logSecurityEvent(supabase, {
        idUsuario: resetResult.idUsuario,
        actionType: 'password_reset_success',
        severity: 'medium',
        details: { email: resetResult.email },
        req,
      });

      return { message: 'Contrasena restablecida correctamente. Ya puedes iniciar sesion.' };
    },

    async obtenerUsuarioActual(authUser) {
      requireSupabase();

      const { data: user, error } = await repository.buscarUsuarioPorId(authUser.id);
      if (error || !user) throw crearError(404, 'Usuario no encontrado');

      const profileId = await resolverIdPerfilParaUsuario({
        id: user.id,
        email: user.email,
        profileId: authUser.profileId,
      });

      return {
        user: usuarioPublico(user, {
          profileId,
          specialCode: normalizarCodigoEspecial(user.special_code),
          favorites: normalizarIdsFavoritos(user.favoritos),
          verified_email: user.verified_email,
          verified_phone: user.verified_phone,
        }),
      };
    },

    async registrarDispositivo(body, authUser) {
      requireSupabase('Supabase no esta configurado para notificaciones');

      const { token, platform = 'unknown', deviceName = null, appVersion = null } = body || {};
      const validation = validarTokenDispositivo(token);
      if (!validation.valid) throw crearError(validation.statusCode, validation.message);

      const device = await repository.registrarDispositivo({
        idUsuario: authUser.id,
        token: validation.token,
        platform,
        deviceName,
        appVersion,
      });

      return { message: 'Dispositivo registrado para notificaciones', device };
    },

    async desactivarDispositivo(rawToken, authUser) {
      requireSupabase('Supabase no esta configurado para notificaciones');

      const deleted = await repository.desactivarDispositivo({
        idUsuario: authUser.id,
        token: decodeURIComponent(rawToken || '').trim(),
      });

      return { message: deleted ? 'Dispositivo desactivado' : 'No se encontro el dispositivo' };
    },

    async listarNotificaciones(query, authUser) {
      requireSupabase('Supabase no esta configurado para notificaciones');

      const limit = parsearEnteroPositivo(query.limit, 50);
      const notifications = await repository.listarNotificaciones(authUser.id, limit);
      return { notifications };
    },

    async marcarNotificacionLeida(params, authUser) {
      requireSupabase('Supabase no esta configurado para notificaciones');

      const validation = validarIdNotificacion(params.id);
      if (!validation.valid) throw crearError(validation.statusCode, validation.message);

      const updated = await repository.marcarNotificacionLeida(authUser.id, validation.idNotificacion);
      if (!updated) throw crearError(404, 'Notificacion no encontrada');

      return { message: 'Notificacion marcada como leida' };
    },

    async obtenerFavoritos(authUser) {
      requireSupabase();

      const { data, error } = await repository.obtenerFavoritos(authUser.id);
      if (error) {
        if (tieneErrorColumna(error, 'favoritos')) {
          throw crearError(400, 'Falta la columna favoritos en Supabase. Ejecuta el SQL actualizado.');
        }
        throw error;
      }

      return { favorites: normalizarIdsFavoritos(data?.favoritos) };
    },

    async actualizarFavoritos(body, authUser) {
      requireSupabase();

      const idsFavoritos = normalizarIdsFavoritos(body?.idsFavoritos);
      const { data, error } = await repository.actualizarFavoritos(authUser.id, idsFavoritos);

      if (error) {
        if (tieneErrorColumna(error, 'favoritos')) {
          throw crearError(400, 'Falta la columna favoritos en Supabase. Ejecuta el SQL actualizado.');
        }
        throw error;
      }

      return {
        message: 'Favoritos actualizados correctamente',
        favorites: normalizarIdsFavoritos(data?.favoritos),
      };
    },

    async actualizarPerfil(body, authUser) {
      requireSupabase();

      const idUsuario = authUser.id;
      const alias = normalizarAlias(body?.alias);
      const specialCode = normalizarCodigoEspecial(body?.specialCode);
      const validation = validarPerfilUsuario({ alias, specialCode, esAliasValido, esCodigoEspecialValido });
      if (!validation.valid) throw crearError(validation.statusCode, validation.message);

      let usuarioActual = null;
      let missingSpecialCodeColumn = false;
      let { data, error } = await repository.obtenerDatosPerfil(idUsuario);

      if (error && tieneErrorColumna(error, 'special_code')) {
        missingSpecialCodeColumn = true;
        const fallbackResponse = await repository.obtenerDatosPerfilSinCodigoEspecial(idUsuario);
        data = fallbackResponse.data;
        error = fallbackResponse.error;
      }

      if (error) throw error;
      usuarioActual = { ...data, special_code: missingSpecialCodeColumn ? null : data?.special_code };

      if (!usuarioActual) throw crearError(404, 'Usuario no encontrado');
      if (!usuarioActual.is_adult && specialCode !== null) {
        throw crearError(403, 'El código especial solo está disponible para perfiles Adulto');
      }

      const currentSpecialCode = normalizarCodigoEspecial(usuarioActual.special_code);
      const nextSpecialCode = usuarioActual.is_adult && specialCode === 'ayuda' && currentSpecialCode === 'ayuda'
        ? null
        : (usuarioActual.is_adult ? specialCode : null);

      if (missingSpecialCodeColumn && nextSpecialCode !== null) {
        throw crearError(400, 'Falta la columna special_code en Supabase. Ejecuta el script SQL actualizado.');
      }

      const updatePayload = missingSpecialCodeColumn ? { alias } : { alias, special_code: nextSpecialCode };
      const selectFields = missingSpecialCodeColumn
        ? 'id, email, nombre, alias, role, is_adult, parent_token'
        : 'id, email, nombre, alias, role, is_adult, parent_token, special_code';

      const { data: updatedUser, error: errorActualizacion } = await repository.actualizarPerfil(
        idUsuario,
        updatePayload,
        selectFields,
      );

      if (errorActualizacion) {
        if (tieneErrorColumna(errorActualizacion, 'alias')) {
          throw crearError(400, 'Falta la columna alias en Supabase. Ejecuta el script SQL actualizado.');
        }
        if (tieneErrorColumna(errorActualizacion, 'special_code')) {
          throw crearError(400, 'Falta la columna special_code en Supabase. Ejecuta el script SQL actualizado.');
        }
        throw errorActualizacion;
      }

      return {
        message: 'Perfil actualizado correctamente',
        user: usuarioPublico(updatedUser, {
          profileId: authUser.profileId || null,
          specialCode: normalizarCodigoEspecial(updatedUser.special_code),
        }),
      };
    },
  };
}
