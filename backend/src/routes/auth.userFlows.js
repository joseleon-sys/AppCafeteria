import bcrypt from 'bcryptjs';
import { restablecerContrasenaUsuario } from '../services/passwordResetService.js';
import { construirUsuarioPublico } from '../utils/utilidadesAuth.js';
import { crearError, requireSupabase } from './auth.errors.js';
import { validarLoginUsuario, validarRegistroUsuario } from './auth.validators.js';

export function crearAuthUserFlows({ deps, repository, tokenService, securityLogger }) {
  const {
    supabase,
    resetLoginAttempts,
    getClientIP,
    logSecurityEvent,
    calculateTrustScore,
    normalizarCodigoEspecial,
    normalizarIdsFavoritos,
    formatearNombreCompleto,
    calcularEdad,
    asegurarPerfilParaUsuarioApp,
    resolverIdPerfilParaUsuario,
    generarTokenPadre,
    esNombreCompletoValido,
  } = deps;

  function usuarioPublico(user, extraData = {}) {
    return construirUsuarioPublico(user, extraData);
  }

  return {
    async registrarUsuario(body, req) {
      requireSupabase(supabase);

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
        await securityLogger.registrarErrorValidacion({
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
          await securityLogger.registrarErrorValidacion({
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
      requireSupabase(supabase);

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

    async restablecerContrasena(body, req) {
      requireSupabase(supabase);

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
      requireSupabase(supabase);

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
  };
}
