// Limitadores simples en memoria para frenar abusos comunes.

const loginAttempts = new Map(); // IP -> { count, firstAttempt }
const registrationAttempts = new Map(); // IP -> { count, firstAttempt }
const linkingAttempts = new Map(); // idUsuario -> { count, firstAttempt }

// Intenta descubrir la IP real del cliente usando varias cabeceras posibles.
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         'unknown';
}

// Borra entradas viejas para que los contadores no crezcan sin limite.
function cleanOldRecords(map, maxAge) {
  const now = Date.now();
  for (const [key, value] of map.entries()) {
    if (now - value.firstAttempt > maxAge) {
      map.delete(key);
    }
  }
}

// Permite como maximo 5 intentos de login por hora y por IP.
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

// Permite como maximo 3 registros por dia desde la misma IP.
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

// Permite como maximo 10 solicitudes de vinculacion por dia y por usuario.
export function linkingRateLimiter(req, res, next) {
  const idUsuario = req.user?.id;
  
  if (!idUsuario) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  cleanOldRecords(linkingAttempts, oneDay);
  
  const attempts = linkingAttempts.get(idUsuario);
  
  if (!attempts) {
    linkingAttempts.set(idUsuario, { count: 1, firstAttempt: now });
    return next();
  }
  
  // Si ha pasado más de 1 día, resetear
  if (now - attempts.firstAttempt > oneDay) {
    linkingAttempts.set(idUsuario, { count: 1, firstAttempt: now });
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

// Si un login termina bien, limpiamos el contador de esa IP.
export function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

export { getClientIP };
