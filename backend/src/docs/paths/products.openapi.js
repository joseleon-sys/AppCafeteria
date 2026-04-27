import { jsonBody, listResponses, requiredJson, securedItemResponses, securedListResponses, basicSecuredResponses } from '../openapi.helpers.js';

export const productPaths = {
  '/api/menu': {
    get: {
      tags: ['Productos'],
      summary: 'Lista el menu publico',
      responses: listResponses('Menu publico', '#/components/schemas/Product'),
    },
  },
  '/api/products': {
    get: {
      tags: ['Productos'],
      summary: 'Lista productos para administracion',
      security: [{ bearerAuth: [] }],
      responses: securedListResponses('Productos', '#/components/schemas/Product'),
    },
    post: {
      tags: ['Productos'],
      summary: 'Crea un producto',
      security: [{ bearerAuth: [] }],
      requestBody: requiredJson('#/components/schemas/ProductInput'),
      responses: securedItemResponses('Producto creado', '#/components/schemas/Product', 201),
    },
  },
  '/api/products/{id}': {
    put: {
      tags: ['Productos'],
      summary: 'Actualiza un producto',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: jsonBody('#/components/schemas/ProductInput'),
      responses: securedItemResponses('Producto actualizado', '#/components/schemas/Product'),
    },
    delete: {
      tags: ['Productos'],
      summary: 'Elimina un producto',
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: basicSecuredResponses('Producto eliminado'),
    },
  },
};
