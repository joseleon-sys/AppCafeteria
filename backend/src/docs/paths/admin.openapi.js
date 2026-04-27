import { basicSecuredResponses, jsonBody, jsonBodyWithExample, securedListResponses } from '../openapi.helpers.js';

function adminGet(summary, description) {
  return {
    tags: ['Admin'],
    summary,
    security: [{ bearerAuth: [] }],
    responses: securedListResponses(description),
  };
}

export const adminPaths = {
  '/api/admin/statistics': {
    get: adminGet('Obtiene metricas del panel administrativo', 'Metricas'),
  },
  '/api/admin/fraud-log': {
    get: adminGet('Lista eventos de prevencion de fraude', 'Fraud logs'),
  },
  '/api/admin/users': {
    get: adminGet('Lista usuarios', 'Usuarios'),
  },
  '/api/admin/users/{id}/block': {
    put: {
      tags: ['Admin'],
      summary: 'Bloquea o desbloquea un usuario',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: jsonBodyWithExample({ bloqueado: true }),
      responses: basicSecuredResponses('Bloqueo actualizado'),
    },
  },
  '/api/admin/users/{id}': {
    put: {
      tags: ['Admin'],
      summary: 'Actualiza un usuario',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: jsonBody('#/components/schemas/AdminUserUpdate'),
      responses: basicSecuredResponses('Usuario actualizado'),
    },
    delete: {
      tags: ['Admin'],
      summary: 'Elimina un usuario',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: basicSecuredResponses('Usuario eliminado'),
    },
  },
  '/api/admin/orders/queue': {
    get: adminGet('Lista cola de pedidos para administracion', 'Cola de pedidos'),
  },
};
