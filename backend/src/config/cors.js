import cors from 'cors';

const LOCAL_DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'capacitor://localhost',
  'http://localhost',
];

function parseAllowedOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAllowedCorsOrigins({
  frontendUrl = process.env.FRONTEND_URL,
  isProduction = process.env.NODE_ENV === 'production',
} = {}) {
  const configuredOrigins = parseAllowedOrigins(frontendUrl);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return isProduction ? [] : LOCAL_DEVELOPMENT_ORIGINS;
}

export function createCorsMiddleware(options = {}) {
  const allowedOrigins = getAllowedCorsOrigins(options);

  return cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      return callback(null, allowedOrigins.includes(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
    optionsSuccessStatus: 204,
  });
}
