# Observabilidad local

Este proyecto tiene dos capas:

- Sentry para errores, performance tracing y replay del frontend.
- ELK para logs estructurados del backend.

## Levantar ELK

Desde la raiz `AppCafeteria/`:

```bash
docker compose -f docker-compose.elk.yml up -d
```

Servicios:

- Elasticsearch: `http://localhost:9200`
- Kibana: `http://localhost:5601`
- Logstash TCP JSON: `localhost:5000`
- Logstash GELF UDP: `localhost:12201`

## Enviar logs del backend a Logstash

En `backend/.env`:

```env
LOG_LEVEL=info
LOGSTASH_TCP_URL=localhost:5000
```

Arranca el backend normalmente:

```bash
cd backend
npm run dev
```

En Kibana crea un data view para:

```text
cafeteria-logs-*
```

## Activar Sentry

Backend, en `backend/.env`:

```env
SENTRY_DSN=https://tu-dsn@sentry.io/proyecto
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=cafeteria-backend@1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_ENABLED=true
```

Frontend, en `frontend/.env`:

```env
VITE_SENTRY_DSN=https://tu-dsn@sentry.io/proyecto
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_RELEASE=cafeteria-frontend@0.1.0
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE=0
VITE_SENTRY_REPLAY_ERROR_SAMPLE_RATE=1
VITE_SENTRY_ENABLED=true
```

## Validacion rapida

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/no-existe
```

El primero debe devolver `observability.sentry` y `observability.logs`. El segundo debe generar una linea JSON en el backend.
