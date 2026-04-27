import {
  basicSecuredResponses,
  childOrderQueryParameters,
  jsonBodyWithExample,
  requiredJson,
  securedItemResponses,
  securedListResponses,
} from '../openapi.helpers.js';

const childOrderTag = 'Familia';

export const childOrderPaths = {
  '/api/child/orders': {
    post: {
      tags: [childOrderTag],
      summary: 'Crea un pedido infantil pendiente de aprobacion',
      security: [{ bearerAuth: [] }],
      requestBody: requiredJson('#/components/schemas/ChildOrderInput'),
      responses: securedItemResponses('Pedido infantil creado', '#/components/schemas/Order', 201),
    },
    get: {
      tags: [childOrderTag],
      summary: 'Lista pedidos del menor autenticado',
      security: [{ bearerAuth: [] }],
      parameters: childOrderQueryParameters(),
      responses: securedListResponses('Pedidos infantiles', '#/components/schemas/Order'),
    },
  },
  '/api/child/orders/{id}': {
    get: {
      tags: [childOrderTag],
      summary: 'Obtiene un pedido del menor autenticado',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: securedItemResponses('Pedido infantil', '#/components/schemas/Order'),
    },
  },
  '/api/parent/child-orders': {
    get: {
      tags: [childOrderTag],
      summary: 'Lista pedidos infantiles visibles para el padre',
      security: [{ bearerAuth: [] }],
      parameters: childOrderQueryParameters(),
      responses: securedListResponses('Pedidos infantiles', '#/components/schemas/Order'),
    },
  },
  '/api/parent/child-orders/history': {
    get: {
      tags: [childOrderTag],
      summary: 'Lista historial de pedidos infantiles del padre',
      security: [{ bearerAuth: [] }],
      parameters: childOrderQueryParameters(),
      responses: securedListResponses('Historial de pedidos infantiles', '#/components/schemas/Order'),
    },
  },
  '/api/parent/orders/{id}': {
    get: {
      tags: [childOrderTag],
      summary: 'Obtiene un pedido infantil como padre',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: securedItemResponses('Pedido infantil', '#/components/schemas/Order'),
    },
  },
  '/api/parent/orders/{id}/approve': {
    put: {
      tags: [childOrderTag],
      summary: 'Aprueba un pedido infantil',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: jsonBodyWithExample({ approved_amount: 7.5 }),
      responses: basicSecuredResponses('Pedido aprobado'),
    },
  },
  '/api/parent/orders/{id}/reject': {
    put: {
      tags: [childOrderTag],
      summary: 'Rechaza un pedido infantil',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: requiredJson('#/components/schemas/RejectRequest'),
      responses: basicSecuredResponses('Pedido rechazado'),
    },
  },
  '/api/parent/orders/{id}/pay': {
    put: {
      tags: [childOrderTag],
      summary: 'Marca como pagado un pedido infantil',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: jsonBodyWithExample({ payment_method: 'cash', amount_paid: 7.5 }),
      responses: basicSecuredResponses('Pedido pagado'),
    },
  },
  '/api/parent/orders/{id}/modify': {
    put: {
      tags: [childOrderTag],
      summary: 'Modifica los items de un pedido infantil',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: requiredJson('#/components/schemas/CreateOrderRequest'),
      responses: securedItemResponses('Pedido modificado', '#/components/schemas/Order'),
    },
  },
};
