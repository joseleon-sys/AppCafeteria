// Rate Limiter Middleware con protección anti-fraude

const loginAttempts = new Map(); // IP -> { count, firstAttempt }
const registrationAttempts = new Map(); // IP -> { count, firstAttempt }
const linkingAttempts = new Map(); // userId -> { count, firstAttempt }

// Helper para obtener IP del cliente
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         'unknown';
}

// Helper para limpiar registros antiguos
function cleanOldRecords(map, maxAge) {
  const now = Date.now();
  for (const [key, value] of map.entries()) {
    if (now - value.firstAttempt > maxAge) {
      map.delete(key);
    }
  }
}

// Middleware: Max 5 intentos de login por hora
export function loginRateLimiter(req, res, next) {
  const ip = getClientIP(req);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  cleanOldRecords(loginAttempts, oneHour);
  
  const attempts = loginAttempts.get(ip);
  
  if (!attempts) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }
  
  // Si han pasado más de 1 hora, resetear contador
  if (now - attempts.firstAttempt > oneHour) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }
  
  // Verificar límite
  if (attempts.count >= 5) {
    const timeRemaining = Math.ceil((oneHour - (now - attempts.firstAttempt)) / 60000);
    return res.status(429).json({ 
      error: `Demasiados intentos de login. Espera ${timeRemaining} minutos.`,
      retryAfter: timeRemaining
    });
  }
  
  attempts.count++;
  next();
}

// Middleware: Max 3 registros desde misma IP por día
export function registrationRateLimiter(req, res, next) {
  const ip = getClientIP(req);
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  cleanOldRecords(registrationAttempts, oneDay);
  
  const attempts = registrationAttempts.get(ip);
  
  if (!attempts) {
    registrationAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }
  
  // Si ha pasado más de 1 día, resetear
  if (now - attempts.firstAttempt > oneDay) {
    registrationAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }
  
  // Verificar límite
  if (attempts.count >= 3) {
    const hoursRemaining = Math.ceil((oneDay - (now - attempts.firstAttempt)) / 3600000);
    return res.status(429).json({ 
      error: `Demasiados registros desde esta IP. Espera ${hoursRemaining} horas.`,
      retryAfter: hoursRemaining
    });
  }
  
  attempts.count++;
  next();
}

// Middleware: Max 10 solicitudes de vinculación por día
export function linkingRateLimiter(req, res, next) {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  cleanOldRecords(linkingAttempts, oneDay);
  
  const attempts = linkingAttempts.get(userId);
  
  if (!attempts) {
    linkingAttempts.set(userId, { count: 1, firstAttempt: now });
    return next();
  }
  
  // Si ha pasado más de 1 día, resetear
  if (now - attempts.firstAttempt > oneDay) {
    linkingAttempts.set(userId, { count: 1, firstAttempt: now });
    return next();
  }
  
  // Verificar límite
  if (attempts.count >= 10) {
    const hoursRemaining = Math.ceil((oneDay - (now - attempts.firstAttempt)) / 3600000);
    return res.status(429).json({ 
      error: `Demasiadas solicitudes de vinculación. Espera ${hoursRemaining} horas.`,
      retryAfter: hoursRemaining
    });
  }
  
  attempts.count++;
  next();
}

// Helper para registrar evento exitoso (resetear contador en login exitoso)
export function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

export { getClientIP };
