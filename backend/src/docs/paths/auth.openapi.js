import {
  authResponses,
  basicSecuredResponses,
  basicResponses,
  jsonBody,
  jsonBodyWithExample,
  requiredJson,
  securedItemResponses,
  securedListResponses,
} from '../openapi.helpers.js';

export const authPaths = {
  '/api/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Registra un usuario',
      requestBody: requiredJson('#/components/schemas/RegisterRequest'),
      responses: authResponses('Usuario registrado'),
    },
  },
  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Inicia sesion',
      requestBody: requiredJson('#/components/schemas/LoginRequest'),
      responses: authResponses('Sesion iniciada'),
    },
  },
  '/api/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Renueva la sesion con refresh token',
      requestBody: requiredJson('#/components/schemas/RefreshTokenRequest'),
      responses: authResponses('Sesion renovada'),
    },
  },
  '/api/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Cierra sesion e invalida el refresh token',
      requestBody: jsonBody('#/components/schemas/RefreshTokenRequest'),
      responses: basicResponses('Sesion cerrada'),
    },
  },
  '/api/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Solicita restablecimiento de contrasena',
      responses: basicResponses('Solicitud procesada'),
    },
  },
  '/api/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Obtiene el usuario autenticado',
      security: [{ bearerAuth: [] }],
      responses: securedItemResponses('Usuario actual', '#/components/schemas/User'),
    },
  },
  '/api/auth/favorites': {
    get: {
      tags: ['Auth'],
      summary: 'Lista favoritos del usuario autenticado',
      security: [{ bearerAuth: [] }],
      responses: securedListResponses('Favoritos'),
    },
    put: {
      tags: ['Auth'],
      summary: 'Actualiza favoritos del usuario autenticado',
      security: [{ bearerAuth: [] }],
      responses: basicSecuredResponses('Favoritos actualizados'),
    },
  },
  '/api/auth/profile': {
    put: {
      tags: ['Auth'],
      summary: 'Actualiza perfil del usuario autenticado',
      security: [{ bearerAuth: [] }],
      responses: basicSecuredResponses('Perfil actualizado'),
    },
  },
  '/api/notifications/devices': {
    post: {
      tags: ['Auth'],
      summary: 'Registra un dispositivo para notificaciones push',
      security: [{ bearerAuth: [] }],
      requestBody: jsonBodyWithExample({ token: 'fcm-device-token' }),
      responses: basicSecuredResponses('Dispositivo registrado'),
    },
  },
  '/api/notifications/devices/{token}': {
    delete: {
      tags: ['Auth'],
      summary: 'Desactiva un dispositivo de notificaciones',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
      responses: basicSecuredResponses('Dispositivo desactivado'),
    },
  },
  '/api/notifications': {
    get: {
      tags: ['Auth'],
      summary: 'Lista notificaciones del usuario autenticado',
      security: [{ bearerAuth: [] }],
      responses: securedListResponses('Notificaciones'),
    },
  },
  '/api/notifications/{id}/read': {
    put: {
      tags: ['Auth'],
      summary: 'Marca una notificacion como leida',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: basicSecuredResponses('Notificacion actualizada'),
    },
  },
};
