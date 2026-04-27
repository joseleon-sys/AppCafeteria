import { basicSecuredResponses, requiredJson, securedListResponses } from '../openapi.helpers.js';

function familyAction(summary, successDescription) {
  return {
    tags: ['Familia'],
    summary,
    security: [{ bearerAuth: [] }],
    parameters: [{ $ref: '#/components/parameters/IdParam' }],
    responses: basicSecuredResponses(successDescription),
  };
}

export const familyPaths = {
  '/api/parent/token': {
    get: {
      tags: ['Familia'],
      summary: 'Obtiene el token de vinculacion del padre',
      security: [{ bearerAuth: [] }],
      responses: basicSecuredResponses('Token de padre'),
    },
  },
  '/api/child/link-parent': {
    post: {
      tags: ['Familia'],
      summary: 'Solicita vinculacion con un padre',
      security: [{ bearerAuth: [] }],
      requestBody: requiredJson('#/components/schemas/LinkParentRequest'),
      responses: basicSecuredResponses('Solicitud creada'),
    },
  },
  '/api/parent/link-requests': {
    get: {
      tags: ['Familia'],
      summary: 'Lista solicitudes de vinculacion recibidas por el padre',
      security: [{ bearerAuth: [] }],
      responses: securedListResponses('Solicitudes'),
    },
  },
  '/api/parent/link-requests/{id}/approve': {
    put: familyAction('Aprueba una solicitud de vinculacion', 'Solicitud aprobada'),
  },
  '/api/parent/link-requests/{id}/reject': {
    put: familyAction('Rechaza una solicitud de vinculacion', 'Solicitud rechazada'),
  },
  '/api/child/my-parents': {
    get: {
      tags: ['Familia'],
      summary: 'Lista padres vinculados del menor',
      security: [{ bearerAuth: [] }],
      responses: securedListResponses('Padres vinculados'),
    },
  },
  '/api/parent/my-children': {
    get: {
      tags: ['Familia'],
      summary: 'Lista hijos vinculados del padre',
      security: [{ bearerAuth: [] }],
      responses: securedListResponses('Hijos vinculados'),
    },
  },
};
