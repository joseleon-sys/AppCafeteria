// Sistema de prevencion de fraude y registro de eventos de seguridad.

import { getClientIP } from './rateLimiter.js';
import { AppError } from '../shared/errors/AppError.js';

// Guarda un evento de seguridad para poder auditar despues comportamientos sospechosos.
export async function logSecurityEvent(supabase, {
  idUsuario = null,
  actionType,
  severity = 'low', // 'low', 'medium', 'high'
  details = {},
  req
}) {
  if (!supabase) {
    console.log('[FRAUD LOG]', { idUsuario, actionType, severity, details });
    return;
  }
  
  const ip = req ? getClientIP(req) : 'unknown';
  const userAgent = req?.headers['user-agent'] || 'unknown';
  
  try {
    await supabase
      .from('fraud_prevention_log')
      .insert([{
        user_id: idUsuario,
        action_type: actionType,
        severity,
        details: JSON.stringify(details),
        ip_address: ip,
        user_agent: userAgent
      }]);
  } catch (error) {
    console.error('Error al registrar evento de seguridad:', error);
  }
}

// Calcula una puntuacion de confianza del usuario entre 0 y 100.
export async function calculateTrustScore(supabase, idUsuario, options = {}) {
  if (!supabase) return 50;
  
  try {
    // Obtener datos del usuario
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', idUsuario)
      .single();
    
    if (!user) return 0;
    
    let score = 50; // Base inicial
    
    // Email verificado: +10
    if (user.verified_email) score += 10;
    
    // Teléfono verificado: +15
    if (user.verified_phone) score += 15;
    
    // Antigüedad de cuenta (>30 días): +10
    const accountAge = Date.now() - new Date(user.created_at).getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (accountAge > thirtyDays) score += 10;
    
    // Obtener pedidos completados
    let orders = null;
    const profileId = options.profileId ? String(options.profileId).trim() : '';
    if (profileId) {
      const { data } = await supabase
        .from('pedidos')
        .select('id, estado, id_perfil, id_pagador')
        .or(`id_perfil.eq.${profileId},id_pagador.eq.${profileId}`);
      orders = data;
    }
    
    if (orders) {
      const completedOrders = orders.filter((o) => ['pagado', 'completed', 'paid', 'completada'].includes(String(o.estado || '').toLowerCase()));
      score += Math.min(completedOrders.length * 5, 25); // Max +25 por pedidos
    }
    
    // Obtener eventos de fraude
    const { data: fraudEvents } = await supabase
      .from('fraud_prevention_log')
      .select('*')
      .eq('user_id', idUsuario)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (fraudEvents) {
      fraudEvents.forEach(event => {
        if (event.severity === 'high') score -= 20;
        else if (event.severity === 'medium') score -= 5;
        else if (event.severity === 'low') score -= 1;
      });
    }
    
    // Obtener vínculos padre-hijo sospechosos
    if (user.role === 'child') {
      const { data: links } = await supabase
        .from('parent_child_links')
        .select('id')
        .eq('child_id', idUsuario);
      
      // Si tiene más de 5 adultos vinculados: muy sospechoso
      if (links && links.length > 5) score -= 30;
    }
    
    // Limitar entre 0 y 100
    return Math.max(0, Math.min(100, score));
  } catch (error) {
    console.error('Error al calcular trust score:', error);
    return 50;
  }
}

// Middleware que bloquea acciones si la confianza del usuario es demasiado baja.
export function requireTrustScore(minimumScore = 40) {
  return async (req, res, next) => {
    const idUsuario = req.user?.id;
    
    if (!idUsuario) {
      return next(new AppError('No autenticado', 401));
    }
    
    const score = await calculateTrustScore(req.supabase, idUsuario);
    
    if (score < minimumScore) {
      await logSecurityEvent(req.supabase, {
        idUsuario,
        actionType: 'low_trust_score_blocked',
        severity: 'high',
        details: { score, minimumRequired: minimumScore },
        req
      });
      
      return next(new AppError('Tu cuenta requiere verificación adicional. Contacta con soporte.', 403, {
        extra: { trustScore: score },
      }));
    }
    
    req.trustScore = score;
    next();
  };
}

// Revisa reglas basicas de negocio para evitar vinculos padre-hijo abusivos.
export async function validateLinkingLimits(supabase, { childId, parentId }) {
  if (!supabase) {
    // Modo mock: permitir
    return { valid: true };
  }
  
  try {
    // Verificar que el hijo no tenga más de 5 adultos vinculados
    const { data: childLinks } = await supabase
      .from('parent_child_links')
      .select('id')
      .eq('child_id', childId)
      .eq('status', 'active');
    
    if (childLinks && childLinks.length >= 5) {
      return { 
        valid: false, 
        reason: 'Este hijo ya tiene el máximo de adultos permitidos (5)',
        severity: 'high'
      };
    }
    
    // Verificar que el padre no tenga más de 10 hijos
    const { data: parentLinks } = await supabase
      .from('parent_child_links')
      .select('id')
      .eq('parent_id', parentId)
      .eq('status', 'active');
    
    if (parentLinks && parentLinks.length >= 10) {
      return { 
        valid: false, 
        reason: 'Este padre ya tiene el máximo de hijos vinculados (10)',
        severity: 'medium'
      };
    }
    
    // Verificar que no haya solicitud pendiente ya
    const { data: pendingLinks } = await supabase
      .from('parent_child_links')
      .select('id')
      .eq('child_id', childId)
      .eq('parent_id', parentId)
      .eq('status', 'pending');
    
    if (pendingLinks && pendingLinks.length > 0) {
      return { 
        valid: false, 
        reason: 'Ya existe una solicitud de vinculación pendiente',
        severity: 'low'
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error al validar límites de vinculación:', error);
    return { valid: false, reason: 'Error al validar', severity: 'medium' };
  }
}
