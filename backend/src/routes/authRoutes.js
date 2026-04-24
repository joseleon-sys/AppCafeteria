// Rutas de autenticacion, perfil basico, sesion y notificaciones del usuario.
import bcrypt from 'bcryptjs';
import { restablecerContrasenaUsuario } from '../services/passwordResetService.js';
import { construirUsuarioPublico, registrarFalloValidacionAuth, firmarTokenAuth } from '../utils/utilidadesAuth.js';

export function registerAuthRoutes(app, deps) {
  const {
    supabase,
    JWT_SECRET,
    autenticarToken,
    registrationRateLimiter,
    loginRateLimiter,
    resetLoginAttempts,
    getClientIP,
    logSecurityEvent,
    calculateTrustScore,
    registrarTokenDispositivo,
    desactivarTokenDispositivo,
    listarNotificacionesUsuario,
    marcarNotificacionComoLeida,
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

  function requireSupabase(res) {
    // Pequeña ayuda para responder siempre igual cuando falta Supabase.
    return res.status(503).json({ error: 'Supabase no esta configurado en el backend' });
  }

  function usuarioPublico(user, extraData = {}) {
    // Envoltorio local para dejar clara la intencion al devolver usuarios al frontend.
    return construirUsuarioPublico(user, extraData);
  }

  app.post('/api/auth/register', registrationRateLimiter, async (req, res) => {
    // Registro de usuarios nuevos con validaciones basicas y asignacion de rol inicial.
    if (!supabase) return requireSupabase(res);

    try {
      const { email, password, name, birthDate } = req.body;
      const formattedName = formatearNombreCompleto(name);

      if (!email || !password || !formattedName || !birthDate) {
        await registrarFalloValidacionAuth({
          supabase,
          logSecurityEvent,
          actionType: 'registration_failed_validation',
          reason: 'missing_fields',
          email,
          req,
        });
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      if (!esNombreCompletoValido(formattedName)) {
        await registrarFalloValidacionAuth({
          supabase,
          logSecurityEvent,
          actionType: 'registration_failed_validation',
          reason: 'invalid_full_name',
          email,
          req,
        });
        return res.status(400).json({ error: 'Debes introducir nombre y apellidos con formato válido' });
      }

      if (password.length < 6) {
        await registrarFalloValidacionAuth({
          supabase,
          logSecurityEvent,
          actionType: 'registration_failed_validation',
          reason: 'weak_password',
          email,
          req,
        });
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }

      const age = calcularEdad(birthDate);
      const isAdult = age >= 18;
      const role = isAdult ? 'customer' : 'child';
      const tokenPadre = isAdult ? generarTokenPadre() : null;
      const passwordHash = await bcrypt.hash(password, 10);

      const { data: datosUsuario, error } = await supabase
        .from('users')
        .insert([{
          email,
          password_hash: passwordHash,
          nombre: formattedName,
          birth_date: birthDate,
          is_adult: isAdult,
          role,
          parent_token: tokenPadre,
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          await registrarFalloValidacionAuth({
            supabase,
            logSecurityEvent,
            actionType: 'registration_duplicate_email',
            reason: 'duplicate_email',
            email,
            req,
            severity: 'medium',
          });
          return res.status(400).json({ error: 'El email ya está registrado' });
        }
        throw error;
      }

      if (!datosUsuario) {
        return res.status(500).json({ error: 'Error al crear usuario' });
      }

      const profileId = await asegurarPerfilParaUsuarioApp(datosUsuario, { password });

      await logSecurityEvent(supabase, {
        idUsuario: datosUsuario.id,
        actionType: 'registration_success',
        severity: 'low',
        details: { email: datosUsuario.email, role: datosUsuario.role, isAdult: datosUsuario.is_adult },
        req,
      });

      const token = firmarTokenAuth(datosUsuario, JWT_SECRET, profileId);

      return res.status(201).json({
        message: 'Usuario creado correctamente',
        token,
        user: usuarioPublico(datosUsuario, {
          profileId,
          specialCode: normalizarCodigoEspecial(datosUsuario.special_code),
        }),
      });
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      await logSecurityEvent(supabase, {
        actionType: 'registration_error',
        severity: 'high',
        details: { error: error.message },
        req,
      });
      return res.status(500).json({ error: 'Error al crear usuario' });
    }
  });

  app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const { email, password } = req.body;
      const clientIP = getClientIP(req);

      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!user) {
        await logSecurityEvent(supabase, {
          actionType: 'login_failed_user_not_found',
          severity: 'medium',
          details: { email },
          req,
        });
        return res.status(401).json({ error: 'Credenciales incorrectas' });
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
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      resetLoginAttempts(clientIP);

      await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

      const profileId = await asegurarPerfilParaUsuarioApp(user, { password });

      await logSecurityEvent(supabase, {
        idUsuario: user.id,
        actionType: 'login_success',
        severity: 'low',
        details: { email: user.email, role: user.role },
        req,
      });

      const token = firmarTokenAuth(user, JWT_SECRET, profileId);

      const trustScore = await calculateTrustScore(supabase, user.id, { profileId });

      return res.json({
        token,
        user: usuarioPublico(user, {
          profileId,
          specialCode: normalizarCodigoEspecial(user.special_code),
          favorites: normalizarIdsFavoritos(user.favoritos),
          trustScore,
        }),
      });
    } catch (error) {
      console.error('Error al hacer login:', error);
      await logSecurityEvent(supabase, {
        actionType: 'login_error',
        severity: 'high',
        details: { error: error.message },
        req,
      });
      return res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const { email, birthDate, newPassword } = req.body;
      const resetResult = await restablecerContrasenaUsuario({
        email,
        birthDate,
        newPassword,
        supabase,
      });

      await logSecurityEvent(supabase, {
        idUsuario: resetResult.idUsuario,
        actionType: 'password_reset_success',
        severity: 'medium',
        details: { email: resetResult.email },
        req,
      });

      return res.json({
        message: 'Contrasena restablecida correctamente. Ya puedes iniciar sesion.',
      });
    } catch (error) {
      console.error('Error al restablecer contrasena:', error);
      await logSecurityEvent(supabase, {
        actionType: 'password_reset_failed',
        severity: error.statusCode && error.statusCode < 500 ? 'low' : 'high',
        details: { error: error.message, email: req.body?.email || null },
        req,
      });

      return res.status(error.statusCode || 500).json({
        error: error.statusCode ? error.message : 'Error al restablecer la contrasena',
      });
    }
  });

  app.get('/api/auth/me', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const { data: user, error } = await supabase.from('users').select('*').eq('id', req.user.id).single();

      if (error || !user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const profileId = await resolverIdPerfilParaUsuario({
        id: user.id,
        email: user.email,
        profileId: req.user.profileId,
      });

      return res.json({
        user: usuarioPublico(user, {
          profileId,
          specialCode: normalizarCodigoEspecial(user.special_code),
          favorites: normalizarIdsFavoritos(user.favoritos),
          verified_email: user.verified_email,
          verified_phone: user.verified_phone,
        }),
      });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return res.status(500).json({ error: 'Error al obtener perfil' });
    }
  });

  app.post('/api/notifications/devices', autenticarToken, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase no esta configurado para notificaciones' });
    const { token, platform = 'unknown', deviceName = null, appVersion = null } = req.body || {};
    if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Token FCM requerido' });

    try {
      const device = await registrarTokenDispositivo(supabase, {
        idUsuario: req.user.id,
        token: token.trim(),
        platform,
        deviceName,
        appVersion,
      });
      return res.status(201).json({ message: 'Dispositivo registrado para notificaciones', device });
    } catch (error) {
      console.error('Error registrando dispositivo push:', error);
      return res.status(500).json({ error: 'No se pudo registrar el dispositivo' });
    }
  });

  app.delete('/api/notifications/devices/:token', autenticarToken, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase no esta configurado para notificaciones' });

    try {
      const deleted = await desactivarTokenDispositivo(supabase, {
        idUsuario: req.user.id,
        token: decodeURIComponent(req.params.token || '').trim(),
      });
      return res.json({ message: deleted ? 'Dispositivo desactivado' : 'No se encontro el dispositivo' });
    } catch (error) {
      console.error('Error desactivando dispositivo push:', error);
      return res.status(500).json({ error: 'No se pudo desactivar el dispositivo' });
    }
  });

  app.get('/api/notifications', autenticarToken, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase no esta configurado para notificaciones' });

    try {
      const limit = parsearEnteroPositivo(req.query.limit, 50);
      const notifications = await listarNotificacionesUsuario(supabase, req.user.id, limit);
      return res.json({ notifications });
    } catch (error) {
      console.error('Error listando notificaciones:', error);
      return res.status(500).json({ error: 'No se pudieron obtener las notificaciones' });
    }
  });

  app.put('/api/notifications/:id/read', autenticarToken, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase no esta configurado para notificaciones' });

    try {
      const idNotificacion = parseInt(req.params.id, 10);
      if (!Number.isFinite(idNotificacion)) {
        return res.status(400).json({ error: 'Identificador de notificacion invalido' });
      }

      const updated = await marcarNotificacionComoLeida(supabase, req.user.id, idNotificacion);
      if (!updated) return res.status(404).json({ error: 'Notificacion no encontrada' });
      return res.json({ message: 'Notificacion marcada como leida' });
    } catch (error) {
      console.error('Error marcando notificacion como leida:', error);
      return res.status(500).json({ error: 'No se pudo actualizar la notificacion' });
    }
  });

  app.get('/api/auth/favorites', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const { data, error } = await supabase.from('users').select('favoritos').eq('id', req.user.id).single();
      if (error) {
        if (error.message?.toLowerCase().includes('favoritos')) {
          return res.status(400).json({ error: 'Falta la columna favoritos en Supabase. Ejecuta el SQL actualizado.' });
        }
        throw error;
      }
      return res.json({ favorites: normalizarIdsFavoritos(data?.favoritos) });
    } catch (error) {
      console.error('Error al obtener favoritos:', error);
      return res.status(500).json({ error: 'Error al obtener favoritos' });
    }
  });

  app.put('/api/auth/favorites', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const idsFavoritos = normalizarIdsFavoritos(req.body?.idsFavoritos);

      const { data, error } = await supabase
        .from('users')
        .update({ favoritos: idsFavoritos })
        .eq('id', req.user.id)
        .select('id, favoritos')
        .single();

      if (error) {
        if (error.message?.toLowerCase().includes('favoritos')) {
          return res.status(400).json({ error: 'Falta la columna favoritos en Supabase. Ejecuta el SQL actualizado.' });
        }
        throw error;
      }

      return res.json({
        message: 'Favoritos actualizados correctamente',
        favorites: normalizarIdsFavoritos(data?.favoritos),
      });
    } catch (error) {
      console.error('Error al actualizar favoritos:', error);
      return res.status(500).json({ error: 'Error al actualizar favoritos' });
    }
  });

  app.put('/api/auth/profile', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const idUsuario = req.user.id;
      const alias = normalizarAlias(req.body?.alias);
      const specialCode = normalizarCodigoEspecial(req.body?.specialCode);

      if (!esAliasValido(alias)) {
        return res.status(400).json({ error: 'Alias inválido. Usa 3-30 caracteres: letras, números, _ . -' });
      }

      if (!esCodigoEspecialValido(specialCode)) {
        return res.status(400).json({ error: 'Código especial inválido. El único valor permitido es "ayuda".' });
      }

      let usuarioActual = null;
      let missingSpecialCodeColumn = false;

      let { data, error } = await supabase
        .from('users')
        .select('id, is_adult, special_code')
        .eq('id', idUsuario)
        .single();

      if (error && error.message?.toLowerCase().includes('special_code')) {
        missingSpecialCodeColumn = true;
        const fallbackResponse = await supabase.from('users').select('id, is_adult').eq('id', idUsuario).single();
        data = fallbackResponse.data;
        error = fallbackResponse.error;
      }

      if (error) throw error;
      usuarioActual = { ...data, special_code: missingSpecialCodeColumn ? null : data?.special_code };

      if (!usuarioActual) return res.status(404).json({ error: 'Usuario no encontrado' });
      if (!usuarioActual.is_adult && specialCode !== null) {
        return res.status(403).json({ error: 'El código especial solo está disponible para perfiles Adulto' });
      }

      const currentSpecialCode = normalizarCodigoEspecial(usuarioActual.special_code);
      const nextSpecialCode = usuarioActual.is_adult && specialCode === 'ayuda' && currentSpecialCode === 'ayuda'
        ? null
        : (usuarioActual.is_adult ? specialCode : null);

      if (missingSpecialCodeColumn && nextSpecialCode !== null) {
        return res.status(400).json({ error: 'Falta la columna special_code en Supabase. Ejecuta el script SQL actualizado.' });
      }

      const updatePayload = missingSpecialCodeColumn ? { alias } : { alias, special_code: nextSpecialCode };
      const selectFields = missingSpecialCodeColumn
        ? 'id, email, nombre, alias, role, is_adult, parent_token'
        : 'id, email, nombre, alias, role, is_adult, parent_token, special_code';

      const { data: updatedUser, error: errorActualizacion } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', idUsuario)
        .select(selectFields)
        .single();

      if (errorActualizacion) {
        if (errorActualizacion.message?.toLowerCase().includes('alias')) {
          return res.status(400).json({ error: 'Falta la columna alias en Supabase. Ejecuta el script SQL actualizado.' });
        }
        if (errorActualizacion.message?.toLowerCase().includes('special_code')) {
          return res.status(400).json({ error: 'Falta la columna special_code en Supabase. Ejecuta el script SQL actualizado.' });
        }
        throw errorActualizacion;
      }

      return res.json({
        message: 'Perfil actualizado correctamente',
        user: usuarioPublico(updatedUser, {
          profileId: req.user.profileId || null,
          specialCode: normalizarCodigoEspecial(updatedUser.special_code),
        }),
      });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      return res.status(500).json({ error: 'Error al actualizar perfil' });
    }
  });
}
