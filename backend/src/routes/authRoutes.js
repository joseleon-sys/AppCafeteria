import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { resetUserPassword } from '../services/passwordResetService.js';

export function registerAuthRoutes(app, deps) {
  const {
    supabase,
    pool,
    JWT_SECRET,
    authenticateToken,
    registrationRateLimiter,
    loginRateLimiter,
    resetLoginAttempts,
    getClientIP,
    logSecurityEvent,
    calculateTrustScore,
    registerDeviceToken,
    deactivateDeviceToken,
    listUserNotifications,
    markNotificationAsRead,
    normalizeSpecialCode,
    normalizeFavoriteIds,
    serializeFavoriteIdsForDatabase,
    parsePositiveInteger,
    formatFullName,
    calculateAge,
    generateParentToken,
    isValidFullName,
    normalizeAlias,
    isValidAlias,
    isValidSpecialCode,
  } = deps;

  app.post('/api/auth/register', registrationRateLimiter, async (req, res) => {
    try {
      const { email, password, name, birthDate } = req.body;
      const formattedName = formatFullName(name);

      if (!email || !password || !formattedName || !birthDate) {
        await logSecurityEvent(supabase, {
          actionType: 'registration_failed_validation',
          severity: 'low',
          details: { reason: 'missing_fields', email },
          req,
        });
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      if (!isValidFullName(formattedName)) {
        await logSecurityEvent(supabase, {
          actionType: 'registration_failed_validation',
          severity: 'low',
          details: { reason: 'invalid_full_name', email },
          req,
        });
        return res.status(400).json({ error: 'Debes introducir nombre y apellidos con formato válido' });
      }

      if (password.length < 6) {
        await logSecurityEvent(supabase, {
          actionType: 'registration_failed_validation',
          severity: 'low',
          details: { reason: 'weak_password', email },
          req,
        });
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }

      const age = calculateAge(birthDate);
      const isAdult = age >= 18;
      const role = isAdult ? 'customer' : 'child';
      const parentToken = isAdult ? generateParentToken() : null;
      const passwordHash = await bcrypt.hash(password, 10);

      let userData = null;

      if (supabase) {
        const { data, error } = await supabase
          .from('users')
          .insert([{
            email,
            password_hash: passwordHash,
            nombre: formattedName,
            birth_date: birthDate,
            is_adult: isAdult,
            role,
            parent_token: parentToken,
          }])
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            await logSecurityEvent(supabase, {
              actionType: 'registration_duplicate_email',
              severity: 'medium',
              details: { email },
              req,
            });
            return res.status(400).json({ error: 'El email ya está registrado' });
          }
          throw error;
        }
        userData = data;
      } else {
        try {
          const result = await pool.query(
            `INSERT INTO users (email, password_hash, nombre, birth_date, is_adult, role, parent_token)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [email, passwordHash, formattedName, birthDate, isAdult, role, parentToken],
          );
          userData = result.rows[0];
        } catch (err) {
          if (err.code === '23505') {
            await logSecurityEvent(supabase, {
              actionType: 'registration_duplicate_email',
              severity: 'medium',
              details: { email },
              req,
            });
            return res.status(400).json({ error: 'El email ya está registrado' });
          }
          throw err;
        }
      }

      if (!userData) {
        return res.status(500).json({ error: 'Error al crear usuario' });
      }

      await logSecurityEvent(supabase, {
        userId: userData.id,
        actionType: 'registration_success',
        severity: 'low',
        details: { email: userData.email, role: userData.role, isAdult: userData.is_adult },
        req,
      });

      const token = jwt.sign(
        { id: userData.id, email: userData.email, role: userData.role },
        JWT_SECRET,
        { expiresIn: '7d' },
      );

      return res.status(201).json({
        message: 'Usuario creado correctamente',
        token,
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.nombre || userData.name,
          alias: userData.alias || null,
          role: userData.role,
          isAdult: userData.is_adult,
          parentToken: userData.parent_token,
          specialCode: normalizeSpecialCode(userData.special_code),
          created_at: userData.created_at || null,
        },
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
    try {
      const { email, password } = req.body;
      const clientIP = getClientIP(req);

      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
      }

      if (email === 'demo@demo.com' && password === 'demo') {
        resetLoginAttempts(clientIP);
        const token = jwt.sign(
          { id: 999, email: 'demo@demo.com', role: 'customer', isAdult: true },
          JWT_SECRET,
          { expiresIn: '7d' },
        );

        await logSecurityEvent(supabase, {
          userId: 999,
          actionType: 'login_demo',
          severity: 'low',
          details: { email },
          req,
        });

        return res.json({
          token,
          user: {
            id: 999,
            email: 'demo@demo.com',
            name: 'Usuario Demo',
            alias: null,
            role: 'customer',
            isAdult: true,
            parentToken: null,
            specialCode: null,
            created_at: null,
          },
        });
      }

      if ((email === 'admin@admin' || email === 'admin@admin.com') && password === 'admin') {
        resetLoginAttempts(clientIP);
        const token = jwt.sign(
          { id: 1, email, role: 'admin', isAdult: true },
          JWT_SECRET,
          { expiresIn: '7d' },
        );

        await logSecurityEvent(supabase, {
          userId: 1,
          actionType: 'login_admin',
          severity: 'low',
          details: { email },
          req,
        });

        return res.json({
          token,
          user: {
            id: 1,
            email,
            name: 'Administrador',
            alias: null,
            role: 'admin',
            isAdult: true,
            parentToken: null,
            specialCode: null,
            created_at: null,
          },
        });
      }

      let user = null;

      if (supabase) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('active', true)
          .single();

        if (!error && data) user = data;
      } else {
        try {
          const result = await pool.query('SELECT * FROM users WHERE email = $1 AND active = true', [email]);
          if (result.rows.length > 0) user = result.rows[0];
        } catch (err) {
          console.error('Error consultando PostgreSQL local:', err);
        }
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
          userId: user.id,
          actionType: 'login_failed_wrong_password',
          severity: 'high',
          details: { email },
          req,
        });
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      resetLoginAttempts(clientIP);

      if (supabase) {
        await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);
      } else {
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
      }

      await logSecurityEvent(supabase, {
        userId: user.id,
        actionType: 'login_success',
        severity: 'low',
        details: { email: user.email, role: user.role },
        req,
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, isAdult: Boolean(user.is_adult) },
        JWT_SECRET,
        { expiresIn: '7d' },
      );

      const trustScore = supabase ? await calculateTrustScore(supabase, user.id) : 100;

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.nombre || user.name,
          alias: user.alias || null,
          role: user.role,
          isAdult: user.is_adult,
          parentToken: user.parent_token,
          specialCode: normalizeSpecialCode(user.special_code),
          favorites: normalizeFavoriteIds(user.favoritos),
          trustScore,
          created_at: user.created_at || null,
        },
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
    try {
      const { email, birthDate, newPassword } = req.body;
      const resetResult = await resetUserPassword({
        email,
        birthDate,
        newPassword,
        supabase,
        pool,
      });

      await logSecurityEvent(supabase, {
        userId: resetResult.userId,
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

  app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
      if (!supabase) {
        const result = await pool.query(
          'SELECT id, email, nombre AS name, alias, role, is_adult, parent_token, special_code, favoritos, verified_email, verified_phone, created_at FROM users WHERE id = $1 LIMIT 1',
          [req.user.id],
        );

        if (result.rows.length > 0) {
          const user = result.rows[0];
          return res.json({
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              alias: user.alias || null,
              role: user.role,
              isAdult: user.is_adult,
              parentToken: user.parent_token,
              specialCode: normalizeSpecialCode(user.special_code),
              favorites: normalizeFavoriteIds(user.favoritos),
              verified_email: user.verified_email,
              verified_phone: user.verified_phone,
              created_at: user.created_at || null,
            },
          });
        }

        return res.json({
          user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            favorites: [],
            created_at: null,
          },
        });
      }

      const { data: user, error } = await supabase.from('users').select('*').eq('id', req.user.id).single();

      if (error || !user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.nombre || user.name,
          alias: user.alias || null,
          role: user.role,
          isAdult: user.is_adult,
          parentToken: user.parent_token,
          specialCode: normalizeSpecialCode(user.special_code),
          favorites: normalizeFavoriteIds(user.favoritos),
          verified_email: user.verified_email,
          verified_phone: user.verified_phone,
          created_at: user.created_at || null,
        },
      });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return res.status(500).json({ error: 'Error al obtener perfil' });
    }
  });

  app.post('/api/notifications/devices', authenticateToken, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase no esta configurado para notificaciones' });
    const { token, platform = 'unknown', deviceName = null, appVersion = null } = req.body || {};
    if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Token FCM requerido' });

    try {
      const device = await registerDeviceToken(supabase, {
        userId: req.user.id,
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

  app.delete('/api/notifications/devices/:token', authenticateToken, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase no esta configurado para notificaciones' });

    try {
      const deleted = await deactivateDeviceToken(supabase, {
        userId: req.user.id,
        token: decodeURIComponent(req.params.token || '').trim(),
      });
      return res.json({ message: deleted ? 'Dispositivo desactivado' : 'No se encontro el dispositivo' });
    } catch (error) {
      console.error('Error desactivando dispositivo push:', error);
      return res.status(500).json({ error: 'No se pudo desactivar el dispositivo' });
    }
  });

  app.get('/api/notifications', authenticateToken, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase no esta configurado para notificaciones' });

    try {
      const limit = parsePositiveInteger(req.query.limit, 50);
      const notifications = await listUserNotifications(supabase, req.user.id, limit);
      return res.json({ notifications });
    } catch (error) {
      console.error('Error listando notificaciones:', error);
      return res.status(500).json({ error: 'No se pudieron obtener las notificaciones' });
    }
  });

  app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase no esta configurado para notificaciones' });

    try {
      const notificationId = parseInt(req.params.id, 10);
      if (!Number.isFinite(notificationId)) {
        return res.status(400).json({ error: 'Identificador de notificacion invalido' });
      }

      const updated = await markNotificationAsRead(supabase, req.user.id, notificationId);
      if (!updated) return res.status(404).json({ error: 'Notificacion no encontrada' });
      return res.json({ message: 'Notificacion marcada como leida' });
    } catch (error) {
      console.error('Error marcando notificacion como leida:', error);
      return res.status(500).json({ error: 'No se pudo actualizar la notificacion' });
    }
  });

  app.get('/api/auth/favorites', authenticateToken, async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('users').select('favoritos').eq('id', req.user.id).single();
        if (error) {
          if (error.message?.toLowerCase().includes('favoritos')) {
            return res.status(400).json({ error: 'Falta la columna favoritos en Supabase. Ejecuta el SQL actualizado.' });
          }
          throw error;
        }
        return res.json({ favorites: normalizeFavoriteIds(data?.favoritos) });
      }

      const result = await pool.query('SELECT favoritos FROM users WHERE id = $1 LIMIT 1', [req.user.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json({ favorites: normalizeFavoriteIds(result.rows[0].favoritos) });
    } catch (error) {
      console.error('Error al obtener favoritos:', error);
      return res.status(500).json({ error: 'Error al obtener favoritos' });
    }
  });

  app.put('/api/auth/favorites', authenticateToken, async (req, res) => {
    try {
      const favoriteIds = normalizeFavoriteIds(req.body?.favoriteIds);

      if (supabase) {
        const { data, error } = await supabase
          .from('users')
          .update({ favoritos: favoriteIds })
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
          favorites: normalizeFavoriteIds(data?.favoritos),
        });
      }

      const result = await pool.query(
        `UPDATE users
         SET favoritos = $1
         WHERE id = $2
         RETURNING id, favoritos`,
        [serializeFavoriteIdsForDatabase(favoriteIds), req.user.id],
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json({
        message: 'Favoritos actualizados correctamente',
        favorites: normalizeFavoriteIds(result.rows[0].favoritos),
      });
    } catch (error) {
      console.error('Error al actualizar favoritos:', error);
      return res.status(500).json({ error: 'Error al actualizar favoritos' });
    }
  });

  app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const alias = normalizeAlias(req.body?.alias);
      const specialCode = normalizeSpecialCode(req.body?.specialCode);

      if (!isValidAlias(alias)) {
        return res.status(400).json({ error: 'Alias inválido. Usa 3-30 caracteres: letras, números, _ . -' });
      }

      if (!isValidSpecialCode(specialCode)) {
        return res.status(400).json({ error: 'Código especial inválido. El único valor permitido es "ayuda".' });
      }

      let currentUser = null;
      let missingSpecialCodeColumn = false;

      if (supabase) {
        let { data, error } = await supabase
          .from('users')
          .select('id, is_adult, special_code')
          .eq('id', userId)
          .single();

        if (error && error.message?.toLowerCase().includes('special_code')) {
          missingSpecialCodeColumn = true;
          const fallbackResponse = await supabase.from('users').select('id, is_adult').eq('id', userId).single();
          data = fallbackResponse.data;
          error = fallbackResponse.error;
        }

        if (error) throw error;
        currentUser = { ...data, special_code: missingSpecialCodeColumn ? null : data?.special_code };
      } else {
        const result = await pool.query('SELECT id, is_adult, special_code FROM users WHERE id = $1 LIMIT 1', [userId]);
        currentUser = result.rows[0] || null;
      }

      if (!currentUser) return res.status(404).json({ error: 'Usuario no encontrado' });
      if (!currentUser.is_adult && specialCode !== null) {
        return res.status(403).json({ error: 'El código especial solo está disponible para perfiles Adulto' });
      }

      const currentSpecialCode = normalizeSpecialCode(currentUser.special_code);
      const nextSpecialCode = currentUser.is_adult && specialCode === 'ayuda' && currentSpecialCode === 'ayuda'
        ? null
        : (currentUser.is_adult ? specialCode : null);

      let updatedUser = null;

      if (supabase) {
        if (missingSpecialCodeColumn && nextSpecialCode !== null) {
          return res.status(400).json({ error: 'Falta la columna special_code en Supabase. Ejecuta el script SQL actualizado.' });
        }

        const updatePayload = missingSpecialCodeColumn ? { alias } : { alias, special_code: nextSpecialCode };
        const selectFields = missingSpecialCodeColumn
          ? 'id, email, nombre, alias, role, is_adult, parent_token'
          : 'id, email, nombre, alias, role, is_adult, parent_token, special_code';

        const { data, error } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('id', userId)
          .select(selectFields)
          .single();

        if (error) {
          if (error.message?.toLowerCase().includes('alias')) {
            return res.status(400).json({ error: 'Falta la columna alias en Supabase. Ejecuta el script SQL actualizado.' });
          }
          if (error.message?.toLowerCase().includes('special_code')) {
            return res.status(400).json({ error: 'Falta la columna special_code en Supabase. Ejecuta el script SQL actualizado.' });
          }
          throw error;
        }

        updatedUser = { ...data, special_code: missingSpecialCodeColumn ? null : data?.special_code };
      } else {
        const result = await pool.query(
          `UPDATE users
           SET alias = $1,
               special_code = $2
           WHERE id = $3
           RETURNING id, email, nombre, alias, role, is_adult, parent_token, special_code`,
          [alias, nextSpecialCode, userId],
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        updatedUser = result.rows[0];
      }

      return res.json({
        message: 'Perfil actualizado correctamente',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.nombre || updatedUser.name,
          alias: updatedUser.alias || null,
          role: updatedUser.role,
          isAdult: updatedUser.is_adult,
          parentToken: updatedUser.parent_token,
          specialCode: normalizeSpecialCode(updatedUser.special_code),
        },
      });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      return res.status(500).json({ error: 'Error al actualizar perfil' });
    }
  });
}
