import { requiredJson, securedItemResponses, securedListResponses, basicSecuredResponses } from '../openapi.helpers.js';

export const orderPaths = {
  '/api/orders': {
    post: {
      tags: ['Pedidos'],
      summary: 'Crea un pedido manual para un usuario adulto',
      security: [{ bearerAuth: [] }],
      requestBody: requiredJson('#/components/schemas/CreateOrderRequest'),
      responses: securedItemResponses('Pedido creado', '#/components/schemas/Order', 201),
    },
  },
  '/api/stripe/create-checkout-session': {
    post: {
      tags: ['Pedidos'],
      summary: 'Crea una sesion de pago Stripe para un pedido adulto',
      security: [{ bearerAuth: [] }],
      requestBody: requiredJson('#/components/schemas/CreateOrderRequest'),
      responses: basicSecuredResponses('Sesion Stripe creada'),
    },
  },
  '/api/orders/my': {
    get: {
      tags: ['Pedidos'],
      summary: 'Lista pedidos del usuario adulto autenticado',
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/StatusQuery' },
        { $ref: '#/components/parameters/LimitQuery' },
      ],
      responses: securedListResponses('Pedidos', '#/components/schemas/Order'),
    },
  },
  '/api/orders/{id}': {
    get: {
      tags: ['Pedidos'],
      summary: 'Obtiene un pedido del usuario adulto autenticado',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: securedItemResponses('Pedido', '#/components/schemas/Order'),
    },
  },
};
