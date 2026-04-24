// Rutas para gestionar la relacion padre-hijo dentro de la aplicacion.
export function registerFamilyRoutes(app, deps) {
  const {
    supabase,
    autenticarToken,
    linkingRateLimiter,
    puedeActuarComoPadre,
    generarTokenPadre,
    normalizarUsuarioRelacionado,
    validateLinkingLimits,
    logSecurityEvent,
    notificarUsuarioSinFallo,
    obtenerNombreVisibleUsuario,
  } = deps;

  function requireSupabase(res) {
    // Respuesta reutilizable cuando la base de datos no esta disponible.
    return res.status(503).json({ error: 'Supabase no esta configurado en el backend' });
  }

  app.get('/api/parent/token', autenticarToken, async (req, res) => {
    // Devuelve el token de vinculacion del adulto o crea uno si todavia no existe.
    if (!supabase) return requireSupabase(res);

    try {
      const idUsuario = req.user.id;
      const { data: user, error } = await supabase
        .from('users')
        .select('id, parent_token, role, is_adult')
        .eq('id', idUsuario)
        .single();

      if (error || !user) return res.status(404).json({ error: 'Usuario no encontrado' });
      if (!puedeActuarComoPadre(user)) {
        return res.status(403).json({ error: 'Solo los adultos pueden tener token de vinculación' });
      }

      if (user.parent_token) {
        return res.json({ tokenPadre: user.parent_token });
      }

      const newToken = generarTokenPadre();
      const { error: errorActualizacion } = await supabase.from('users').update({ parent_token: newToken }).eq('id', idUsuario);
      if (errorActualizacion) throw errorActualizacion;

      return res.json({ tokenPadre: newToken });
    } catch (error) {
      console.error('Error al obtener token:', error);
      return res.status(500).json({ error: 'Error al obtener token' });
    }
  });

  app.post('/api/child/link-parent', autenticarToken, linkingRateLimiter, async (req, res) => {
    // Un hijo usa el token de un adulto para crear una solicitud de vinculacion.
    if (!supabase) return requireSupabase(res);

    try {
      const childId = req.user.id;
      const { tokenPadre } = req.body || {};
      const normalizedParentToken = String(tokenPadre || '').trim().toUpperCase();

      if (!normalizedParentToken) return res.status(400).json({ error: 'Token de padre requerido' });

      const { data: child } = await supabase
        .from('users')
        .select('id, nombre, alias, role, is_adult, email')
        .eq('id', childId)
        .single();

      const { data: parentData } = await supabase
        .from('users')
        .select('id, nombre, email, role, is_adult')
        .eq('parent_token', normalizedParentToken)
        .single();

      const parent = normalizarUsuarioRelacionado(parentData);

      if (!child || child.role !== 'child' || child.is_adult) {
        return res.status(403).json({ error: 'Solo los hijos pueden vincular padres' });
      }

      if (!parent || !puedeActuarComoPadre(parent)) {
        await logSecurityEvent(supabase, {
          idUsuario: childId,
          actionType: 'link_invalid_token',
          severity: 'medium',
          details: { token: normalizedParentToken },
          req,
        });
        return res.status(404).json({ error: 'Token de padre no válido' });
      }

      const validation = await validateLinkingLimits(supabase, { childId, parentId: parent.id });
      if (!validation.valid) {
        await logSecurityEvent(supabase, {
          idUsuario: childId,
          actionType: 'link_limit_exceeded',
          severity: validation.severity,
          details: { reason: validation.reason, parentId: parent.id },
          req,
        });
        return res.status(400).json({ error: validation.reason });
      }

      const { data: link, error } = await supabase
        .from('parent_child_links')
        .insert([{ parent_id: parent.id, child_id: childId, status: 'pending' }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({ error: 'Ya existe una relación o solicitud previa con este padre' });
        }
        throw error;
      }

      await logSecurityEvent(supabase, {
        idUsuario: childId,
        actionType: 'link_request_created',
        severity: 'low',
        details: { parentId: parent.id, linkId: link.id },
        req,
      });

      await notificarUsuarioSinFallo(parent.id, {
        type: 'link_request_created',
        title: 'Nueva solicitud de vinculacion',
        body: `${obtenerNombreVisibleUsuario(child)} quiere vincularse contigo en la app.`,
        data: { linkId: link.id, childId, targetScreen: 'link-requests' },
      });

      return res.status(201).json({
        message: 'Solicitud de vinculación enviada',
        link: { id: link.id, parentName: parent?.name || null, status: link.status },
      });
    } catch (error) {
      console.error('Error al solicitar vinculación:', error);
      return res.status(500).json({ error: 'Error al crear solicitud' });
    }
  });

  app.get('/api/parent/link-requests', autenticarToken, async (req, res) => {
    // Lista solicitudes pendientes que el padre puede aprobar o rechazar.
    if (!supabase) return requireSupabase(res);

    try {
      const parentId = req.user.id;
      const { data: parent } = await supabase.from('users').select('id, role, is_adult').eq('id', parentId).single();

      if (!puedeActuarComoPadre(parent)) {
        return res.status(403).json({ error: 'Solo los adultos pueden ver solicitudes familiares' });
      }

      const { data: requests, error } = await supabase
        .from('parent_child_links')
        .select(`
          id,
          status,
          requested_at,
          child:child_id (
            id,
            nombre,
            email
          )
        `)
        .eq('parent_id', parentId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return res.json({ requests: (requests || []).map((request) => ({ ...request, child: normalizarUsuarioRelacionado(request.child) })) });
    } catch (error) {
      console.error('Error al obtener solicitudes:', error);
      return res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
  });

  app.put('/api/parent/link-requests/:id/approve', autenticarToken, async (req, res) => {
    // Convierte una solicitud pendiente en un vinculo activo.
    if (!supabase) return requireSupabase(res);

    try {
      const parentId = req.user.id;
      const linkId = req.params.id;
      const { limiteGasto = 20.0 } = req.body || {};

      const { data: link, error: linkError } = await supabase
        .from('parent_child_links')
        .select('*, child:child_id(id, nombre, email)')
        .eq('id', linkId)
        .eq('parent_id', parentId)
        .eq('status', 'pending')
        .single();

      if (linkError) throw linkError;
      if (!link) return res.status(404).json({ error: 'Solicitud no encontrada' });

      const { data: updated, error } = await supabase
        .from('parent_child_links')
        .update({ status: 'active', approved_at: new Date().toISOString(), spending_limit: limiteGasto })
        .eq('id', linkId)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('users').update({ role: 'parent' }).eq('id', parentId).eq('is_adult', true).eq('role', 'customer');

      await logSecurityEvent(supabase, {
        idUsuario: parentId,
        actionType: 'link_approved',
        severity: 'low',
        details: { linkId, childId: link.child_id, limiteGasto },
        req,
      });

      await notificarUsuarioSinFallo(link.child_id, {
        type: 'link_request_approved',
        title: 'Vinculacion aprobada',
        body: 'Tu solicitud de vinculacion familiar ha sido aprobada.',
        data: { linkId, parentId, targetScreen: 'profile-family' },
      });

      return res.json({ message: 'Vinculación aprobada', link: updated });
    } catch (error) {
      console.error('Error al aprobar vinculación:', error);
      return res.status(500).json({ error: 'Error al aprobar vinculación' });
    }
  });

  app.put('/api/parent/link-requests/:id/reject', autenticarToken, async (req, res) => {
    // Rechaza una solicitud y deja constancia del motivo.
    if (!supabase) return requireSupabase(res);

    try {
      const parentId = req.user.id;
      const linkId = req.params.id;
      const { reason } = req.body || {};

      const { data: link } = await supabase
        .from('parent_child_links')
        .select('*')
        .eq('id', linkId)
        .eq('parent_id', parentId)
        .eq('status', 'pending')
        .single();

      if (!link) return res.status(404).json({ error: 'Solicitud no encontrada' });

      const { error } = await supabase
        .from('parent_child_links')
        .update({ status: 'rejected', notes: reason || 'Rechazado por el padre' })
        .eq('id', linkId);

      if (error) throw error;

      await logSecurityEvent(supabase, {
        idUsuario: parentId,
        actionType: 'link_rejected',
        severity: 'low',
        details: { linkId, childId: link.child_id, reason },
        req,
      });

      await notificarUsuarioSinFallo(link.child_id, {
        type: 'link_request_rejected',
        title: 'Vinculacion rechazada',
        body: reason || 'Tu solicitud de vinculacion ha sido rechazada.',
        data: { linkId, parentId, targetScreen: 'profile-family' },
      });

      return res.json({ message: 'Vinculación rechazada' });
    } catch (error) {
      console.error('Error al rechazar vinculación:', error);
      return res.status(500).json({ error: 'Error al rechazar vinculación' });
    }
  });

  app.get('/api/child/my-parents', autenticarToken, async (req, res) => {
    // Permite al hijo consultar con que padres esta relacionado.
    if (!supabase) return requireSupabase(res);

    try {
      const { data: links, error } = await supabase
        .from('parent_child_links')
        .select(`
          id,
          status,
          spending_limit,
          approved_at,
          parent:parent_id (
            id,
            nombre,
            email
          )
        `)
        .eq('child_id', req.user.id)
        .in('status', ['active', 'pending']);

      if (error) throw error;
      return res.json({ parents: (links || []).map((link) => ({ ...link, parent: normalizarUsuarioRelacionado(link.parent) })) });
    } catch (error) {
      console.error('Error al obtener padres:', error);
      return res.status(500).json({ error: 'Error al obtener padres' });
    }
  });

  app.get('/api/parent/my-children', autenticarToken, async (req, res) => {
    // Permite al adulto ver sus hijos vinculados activos.
    if (!supabase) return requireSupabase(res);

    try {
      const parentId = req.user.id;
      const { data: parent } = await supabase.from('users').select('id, role, is_adult').eq('id', parentId).single();

      if (!puedeActuarComoPadre(parent)) {
        return res.status(403).json({ error: 'Solo los adultos pueden ver sus hijos vinculados' });
      }

      const { data: links, error } = await supabase
        .from('parent_child_links')
        .select(`
          id,
          status,
          spending_limit,
          approved_at,
          child:child_id (
            id,
            nombre,
            email
          )
        `)
        .eq('parent_id', parentId)
        .eq('status', 'active');

      if (error) throw error;
      return res.json({ children: (links || []).map((link) => ({ ...link, child: normalizarUsuarioRelacionado(link.child) })) });
    } catch (error) {
      console.error('Error al obtener hijos:', error);
      return res.status(500).json({ error: 'Error al obtener hijos' });
    }
  });
}
