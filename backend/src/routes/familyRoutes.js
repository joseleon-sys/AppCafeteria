export function registerFamilyRoutes(app, deps) {
  const {
    supabase,
    pool,
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

  app.get('/api/parent/token', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      let user = null;

      if (supabase) {
        const { data, error } = await supabase.from('users').select('id, parent_token, role, is_adult').eq('id', userId).single();
        if (error || !data) return res.status(404).json({ error: 'Usuario no encontrado' });
        user = data;
      } else {
        const result = await pool.query('SELECT id, parent_token, role, is_adult FROM users WHERE id = $1 LIMIT 1', [userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        user = result.rows[0];
      }

      if (!isParentCapableUser(user)) {
        return res.status(403).json({ error: 'Solo los adultos pueden tener token de vinculación' });
      }

      if (!user.parent_token) {
        const newToken = generateParentToken();
        if (supabase) {
          const { error } = await supabase.from('users').update({ parent_token: newToken }).eq('id', userId);
          if (error) throw error;
        } else {
          await pool.query('UPDATE users SET parent_token = $1 WHERE id = $2', [newToken, userId]);
        }
        return res.json({ parentToken: newToken });
      }

      return res.json({ parentToken: user.parent_token });
    } catch (error) {
      console.error('Error al obtener token:', error);
      return res.status(500).json({ error: 'Error al obtener token' });
    }
  });

  app.post('/api/child/link-parent', authenticateToken, linkingRateLimiter, async (req, res) => {
    try {
      const childId = req.user.id;
      const { parentToken } = req.body;
      const normalizedParentToken = String(parentToken || '').trim().toUpperCase();

      if (!normalizedParentToken) return res.status(400).json({ error: 'Token de padre requerido' });

      let child = null;
      let parent = null;

      if (supabase) {
        const { data: childData } = await supabase.from('users').select('id, nombre, alias, role, is_adult, email').eq('id', childId).single();
        child = childData;
        const { data: parentData } = await supabase.from('users').select('id, nombre, email, role, is_adult').eq('parent_token', normalizedParentToken).single();
        parent = normalizeRelatedUser(parentData);
      } else {
        const childResult = await pool.query(
          'SELECT id, nombre AS name, alias, role, is_adult, email FROM users WHERE id = $1 AND active = true LIMIT 1',
          [childId],
        );
        child = childResult.rows[0] || null;
        const parentResult = await pool.query(
          'SELECT id, nombre AS name, email, role, is_adult FROM users WHERE parent_token = $1 AND active = true LIMIT 1',
          [normalizedParentToken],
        );
        parent = parentResult.rows[0] || null;
      }

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

      if (supabase) {
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
      } else {
        const childLinks = await pool.query(
          "SELECT COUNT(*)::int AS total FROM parent_child_links WHERE child_id = $1 AND status = 'active'",
          [childId],
        );
        if ((childLinks.rows[0]?.total || 0) >= 5) {
          return res.status(400).json({ error: 'Este hijo ya tiene el máximo de adultos permitidos (5)' });
        }

        const parentLinks = await pool.query(
          "SELECT COUNT(*)::int AS total FROM parent_child_links WHERE parent_id = $1 AND status = 'active'",
          [parent.id],
        );
        if ((parentLinks.rows[0]?.total || 0) >= 10) {
          return res.status(400).json({ error: 'Este padre ya tiene el máximo de hijos vinculados (10)' });
        }

        const pendingLinks = await pool.query(
          "SELECT id FROM parent_child_links WHERE child_id = $1 AND parent_id = $2 AND status = 'pending' LIMIT 1",
          [childId, parent.id],
        );
        if (pendingLinks.rows.length > 0) {
          return res.status(400).json({ error: 'Ya existe una solicitud de vinculación pendiente' });
        }
      }

      let link = null;
      if (supabase) {
        const { data, error } = await supabase
          .from('parent_child_links')
          .insert([{ parent_id: parent.id, child_id: childId, status: 'pending' }])
          .select()
          .single();
        if (error) throw error;
        link = data;
      } else {
        try {
          const result = await pool.query(
            `INSERT INTO parent_child_links (parent_id, child_id, status)
             VALUES ($1, $2, 'pending')
             RETURNING *`,
            [parent.id, childId],
          );
          link = result.rows[0];
        } catch (error) {
          if (error.code === '23505') {
            return res.status(400).json({ error: 'Ya existe una relación o solicitud previa con este padre' });
          }
          throw error;
        }
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
    try {
      const parentId = req.user.id;
      let parent = null;

      if (supabase) {
        const { data } = await supabase.from('users').select('id, role, is_adult').eq('id', parentId).single();
        parent = data;
      } else {
        const parentResult = await pool.query('SELECT id, role, is_adult FROM users WHERE id = $1 LIMIT 1', [parentId]);
        parent = parentResult.rows[0] || null;
      }

      if (!isParentCapableUser(parent)) {
        return res.status(403).json({ error: 'Solo los adultos pueden ver solicitudes familiares' });
      }

      if (supabase) {
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
      }

      const result = await pool.query(
        `SELECT
          l.id,
          l.status,
          l.requested_at,
          json_build_object('id', c.id, 'name', c.nombre, 'email', c.email) AS child
        FROM parent_child_links l
        JOIN users c ON c.id = l.child_id
        WHERE l.parent_id = $1
          AND l.status = 'pending'
        ORDER BY l.requested_at DESC`,
        [parentId],
      );

      return res.json({ requests: result.rows || [] });
    } catch (error) {
      console.error('Error al obtener solicitudes:', error);
      return res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
  });

  app.put('/api/parent/link-requests/:id/approve', authenticateToken, async (req, res) => {
    try {
      const parentId = req.user.id;
      const linkId = req.params.id;
      const { spendingLimit = 20.0 } = req.body;
      let link = null;
      let updated = null;

      if (supabase) {
        const { data: linkData, error: linkError } = await supabase
          .from('parent_child_links')
          .select('*, child:child_id(id, nombre, email)')
          .eq('id', linkId)
          .eq('parent_id', parentId)
          .eq('status', 'pending')
          .single();

        if (linkError) throw linkError;
        if (!linkData) return res.status(404).json({ error: 'Solicitud no encontrada' });
        link = linkData;

        const { data: updatedData, error } = await supabase
          .from('parent_child_links')
          .update({ status: 'active', approved_at: new Date().toISOString(), spending_limit: spendingLimit })
          .eq('id', linkId)
          .select()
          .single();

        if (error) throw error;
        updated = updatedData;

        await supabase.from('users').update({ role: 'parent' }).eq('id', parentId).eq('is_adult', true).eq('role', 'customer');
      } else {
        const linkResult = await pool.query(
          `SELECT l.*, c.nombre AS child_name, c.email AS child_email
           FROM parent_child_links l
           JOIN users c ON c.id = l.child_id
           WHERE l.id = $1 AND l.parent_id = $2 AND l.status = 'pending'
           LIMIT 1`,
          [linkId, parentId],
        );

        if (linkResult.rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
        link = linkResult.rows[0];

        const updatedResult = await pool.query(
          `UPDATE parent_child_links
           SET status = 'active', approved_at = NOW(), spending_limit = $1
           WHERE id = $2
           RETURNING *`,
          [spendingLimit, linkId],
        );
        updated = updatedResult.rows[0];

        await pool.query(
          `UPDATE users
           SET role = 'parent'
           WHERE id = $1
             AND is_adult = true
             AND role = 'customer'`,
          [parentId],
        );
      }

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
    try {
      const parentId = req.user.id;
      const linkId = req.params.id;
      const { reason } = req.body;
      let link = null;

      if (supabase) {
        const { data } = await supabase
          .from('parent_child_links')
          .select('*')
          .eq('id', linkId)
          .eq('parent_id', parentId)
          .eq('status', 'pending')
          .single();
        link = data;
      } else {
        const linkResult = await pool.query(
          `SELECT *
           FROM parent_child_links
           WHERE id = $1 AND parent_id = $2 AND status = 'pending'
           LIMIT 1`,
          [linkId, parentId],
        );
        link = linkResult.rows[0] || null;
      }

      if (!link) return res.status(404).json({ error: 'Solicitud no encontrada' });

      if (supabase) {
        const { error } = await supabase
          .from('parent_child_links')
          .update({ status: 'rejected', notes: reason || 'Rechazado por el padre' })
          .eq('id', linkId);
        if (error) throw error;
      } else {
        await pool.query(
          `UPDATE parent_child_links
           SET status = 'rejected', notes = $1
           WHERE id = $2`,
          [reason || 'Rechazado por el padre', linkId],
        );
      }

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
    try {
      const childId = req.user.id;

      if (supabase) {
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
          .eq('child_id', childId)
          .in('status', ['active', 'pending']);

        if (error) throw error;
        return res.json({ parents: (links || []).map((link) => ({ ...link, parent: normalizeRelatedUser(link.parent) })) });
      }

      const result = await pool.query(
        `SELECT
          l.id,
          l.status,
          l.spending_limit,
          l.approved_at,
          json_build_object('id', p.id, 'name', p.nombre, 'email', p.email) AS parent
        FROM parent_child_links l
        JOIN users p ON p.id = l.parent_id
        WHERE l.child_id = $1
          AND l.status IN ('active', 'pending')`,
        [childId],
      );

      return res.json({ parents: result.rows || [] });
    } catch (error) {
      console.error('Error al obtener padres:', error);
      return res.status(500).json({ error: 'Error al obtener padres' });
    }
  });

  app.get('/api/parent/my-children', authenticateToken, async (req, res) => {
    try {
      const parentId = req.user.id;
      let parent = null;

      if (supabase) {
        const { data } = await supabase.from('users').select('id, role, is_adult').eq('id', parentId).single();
        parent = data;
      } else {
        const parentResult = await pool.query('SELECT id, role, is_adult FROM users WHERE id = $1 LIMIT 1', [parentId]);
        parent = parentResult.rows[0] || null;
      }

      if (!isParentCapableUser(parent)) {
        return res.status(403).json({ error: 'Solo los adultos pueden ver sus hijos vinculados' });
      }

      if (supabase) {
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
      }

      const result = await pool.query(
        `SELECT
          l.id,
          l.status,
          l.spending_limit,
          l.approved_at,
          json_build_object('id', c.id, 'name', c.nombre, 'email', c.email) AS child
        FROM parent_child_links l
        JOIN users c ON c.id = l.child_id
        WHERE l.parent_id = $1
          AND l.status = 'active'`,
        [parentId],
      );

      return res.json({ children: result.rows || [] });
    } catch (error) {
      console.error('Error al obtener hijos:', error);
      return res.status(500).json({ error: 'Error al obtener hijos' });
    }
  });
}
