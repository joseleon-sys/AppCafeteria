// Sistema de Fraud Prevention y Logging

import { getClientIP } from './rateLimiter.js';

// Helper para registrar eventos de seguridad en fraud_prevention_log
export async function logSecurityEvent(supabase, {
  userId = null,
  actionType,
  severity = 'low', // 'low', 'medium', 'high'
  details = {},
  req
}) {
  if (!supabase) {
    console.log('[FRAUD LOG]', { userId, actionType, severity, details });
    return;
  }
  
  const ip = req ? getClientIP(req) : 'unknown';
  const userAgent = req?.headers['user-agent'] || 'unknown';
  
  try {
    await supabase
      .from('fraud_prevention_log')
      .insert([{
        user_id: userId,
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

// Calcular puntuación de confianza (Trust Score)
export async function calculateTrustScore(supabase, userId) {
  if (!supabase) return 50;
  
  try {
    // Obtener datos del usuario
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
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
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status')
      .eq('user_id', userId);
    
    if (orders) {
      const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'paid');
      score += Math.min(completedOrders.length * 5, 25); // Max +25 por pedidos
    }
    
    // Obtener eventos de fraude
    const { data: fraudEvents } = await supabase
      .from('fraud_prevention_log')
      .select('*')
      .eq('user_id', userId)
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
        .eq('child_id', userId);
      
      // Si tiene más de 2 padres: muy sospechoso
      if (links && links.length > 2) score -= 30;
    }
    
    // Limitar entre 0 y 100
    return Math.max(0, Math.min(100, score));
  } catch (error) {
    console.error('Error al calcular trust score:', error);
    return 50;
  }
}

// Middleware para verificar trust score mínimo
export function requireTrustScore(minimumScore = 40) {
  return async (req, res, next) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const score = await calculateTrustScore(req.supabase, userId);
    
    if (score < minimumScore) {
      await logSecurityEvent(req.supabase, {
        userId,
        actionType: 'low_trust_score_blocked',
        severity: 'high',
        details: { score, minimumRequired: minimumScore },
        req
      });
      
      return res.status(403).json({ 
        error: 'Tu cuenta requiere verificación adicional. Contacta con soporte.',
        trustScore: score
      });
    }
    
    req.trustScore = score;
    next();
  };
}

// Validar límites de vinculación padre-hijo
export async function validateLinkingLimits(supabase, { childId, parentId }) {
  if (!supabase) {
    // Modo mock: permitir
    return { valid: true };
  }
  
  try {
    // Verificar que el hijo no tenga más de 2 padres
    const { data: childLinks } = await supabase
      .from('parent_child_links')
      .select('id')
      .eq('child_id', childId)
      .eq('status', 'active');
    
    if (childLinks && childLinks.length >= 2) {
      return { 
        valid: false, 
        reason: 'Este hijo ya tiene el máximo de padres permitidos (2)',
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
