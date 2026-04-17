export function registerFamilyRoutes(app, deps) {
  const {
    supabase,
    authenticateToken,
    linkingRateLimiter,
    isParentCapableUser,
    generateParentToken,
    normalizeRelatedUser,
    validateLinkingLimits,
    logSecurityEvent,
    notifyUserSafely,
    getUserDisplayName,
  } = deps;

  function requireSupabase(res) {
    return res.status(503).json({ error: 'Supabase no esta configurado en el backend' });
  }

  app.get('/api/parent/token', authenticateToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const userId = req.user.id;
      const { data: user, error } = await supabase
        .from('users')
        .select('id, parent_token, role, is_adult')
        .eq('id', userId)
        .single();

      if (error || !user) return res.status(404).json({ error: 'Usuario no encontrado' });
      if (!isParentCapableUser(user)) {
        return res.status(403).json({ error: 'Solo los adultos pueden tener token de vinculación' });
      }

      if (user.parent_token) {
        return res.json({ parentToken: user.parent_token });
      }

      const newToken = generateParentToken();
      const { error: updateError } = await supabase.from('users').update({ parent_token: newToken }).eq('id', userId);
      if (updateError) throw updateError;

      return res.json({ parentToken: newToken });
    } catch (error) {
      console.error('Error al obtener token:', error);
      return res.status(500).json({ error: 'Error al obtener token' });
    }
  });

  app.post('/api/child/link-parent', authenticateToken, linkingRateLimiter, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const childId = req.user.id;
      const { parentToken } = req.body || {};
      const normalizedParentToken = String(parentToken || '').trim().toUpperCase();

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

      const parent = normalizeRelatedUser(parentData);

      if (!child || child.role !== 'child' || child.is_adult) {
        return res.status(403).json({ error: 'Solo los hijos pueden vincular padres' });
      }

      if (!parent || !isParentCapableUser(parent)) {
        await logSecurityEvent(supabase, {
          userId: childId,
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
          userId: childId,
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
        userId: childId,
        actionType: 'link_request_created',
        severity: 'low',
        details: { parentId: parent.id, linkId: link.id },
        req,
      });

      await notifyUserSafely(parent.id, {
        type: 'link_request_created',
        title: 'Nueva solicitud de vinculacion',
        body: `${getUserDisplayName(child)} quiere vincularse contigo en la app.`,
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

  app.get('/api/parent/link-requests', authenticateToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const parentId = req.user.id;
      const { data: parent } = await supabase.from('users').select('id, role, is_adult').eq('id', parentId).single();

      if (!isParentCapableUser(parent)) {
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
      return res.json({ requests: (requests || []).map((request) => ({ ...request, child: normalizeRelatedUser(request.child) })) });
    } catch (error) {
      console.error('Error al obtener solicitudes:', error);
      return res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
  });

  app.put('/api/parent/link-requests/:id/approve', authenticateToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const parentId = req.user.id;
      const linkId = req.params.id;
      const { spendingLimit = 20.0 } = req.body || {};

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
        .update({ status: 'active', approved_at: new Date().toISOString(), spending_limit: spendingLimit })
        .eq('id', linkId)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('users').update({ role: 'parent' }).eq('id', parentId).eq('is_adult', true).eq('role', 'customer');

      await logSecurityEvent(supabase, {
        userId: parentId,
        actionType: 'link_approved',
        severity: 'low',
        details: { linkId, childId: link.child_id, spendingLimit },
        req,
      });

      await notifyUserSafely(link.child_id, {
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

  app.put('/api/parent/link-requests/:id/reject', authenticateToken, async (req, res) => {
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
        userId: parentId,
        actionType: 'link_rejected',
        severity: 'low',
        details: { linkId, childId: link.child_id, reason },
        req,
      });

      await notifyUserSafely(link.child_id, {
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

  app.get('/api/child/my-parents', authenticateToken, async (req, res) => {
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
      return res.json({ parents: (links || []).map((link) => ({ ...link, parent: normalizeRelatedUser(link.parent) })) });
    } catch (error) {
      console.error('Error al obtener padres:', error);
      return res.status(500).json({ error: 'Error al obtener padres' });
    }
  });

  app.get('/api/parent/my-children', authenticateToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const parentId = req.user.id;
      const { data: parent } = await supabase.from('users').select('id, role, is_adult').eq('id', parentId).single();

      if (!isParentCapableUser(parent)) {
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
      return res.json({ children: (links || []).map((link) => ({ ...link, child: normalizeRelatedUser(link.child) })) });
    } catch (error) {
      console.error('Error al obtener hijos:', error);
      return res.status(500).json({ error: 'Error al obtener hijos' });
    }
  });
}
