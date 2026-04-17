import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import net from 'net';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.fcmToken',
  'res.headers["set-cookie"]',
];

export function createHttpLogger() {
  return pinoHttp({
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },
    genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
    customProps: (req) => ({
      service: 'cafeteria-backend',
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      userId: req.user?.id ? String(req.user.id) : undefined,
      userRole: req.user?.role,
    }),
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: {
      ignore: (req) => req.url === '/api/health',
    },
  }, createLogStream());
}

function parseLogstashUrl(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  const normalized = rawValue.includes('://') ? rawValue : `tcp://${rawValue}`;
  try {
    const url = new URL(normalized);
    return {
      host: url.hostname,
      port: Number.parseInt(url.port || '5000', 10),
    };
  } catch {
    return null;
  }
}

function createLogstashWriter() {
  const target = parseLogstashUrl(process.env.LOGSTASH_TCP_URL);
  if (!target) return null;

  let socket = null;
  let reconnectTimer = null;

  const connect = () => {
    socket = net.createConnection(target);
    socket.on('error', () => {});
    socket.on('close', () => {
      socket = null;
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 5000);
        reconnectTimer.unref?.();
      }
    });
  };

  connect();

  return (line) => {
    if (socket?.writable) {
      socket.write(line);
    }
  };
}

function createLogStream() {
  const writeToLogstash = createLogstashWriter();

  return {
    write(line) {
      process.stdout.write(line);
      writeToLogstash?.(line);
    },
  };
}
