import { openApiComponents, openApiTags } from './openapi.components.js';
import { adminPaths } from './paths/admin.openapi.js';
import { authPaths } from './paths/auth.openapi.js';
import { childOrderPaths } from './paths/childOrders.openapi.js';
import { familyPaths } from './paths/family.openapi.js';
import { orderPaths } from './paths/orders.openapi.js';
import { productPaths } from './paths/products.openapi.js';
import { systemPaths } from './paths/system.openapi.js';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AppCafeteria API',
    version: '1.0.0',
    description: 'Documentacion OpenAPI de los endpoints principales del backend de AppCafeteria.',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Backend local',
    },
  ],
  tags: openApiTags,
  components: openApiComponents,
  paths: {
    ...systemPaths,
    ...authPaths,
    ...productPaths,
    ...orderPaths,
    ...familyPaths,
    ...childOrderPaths,
    ...adminPaths,
  },
};
