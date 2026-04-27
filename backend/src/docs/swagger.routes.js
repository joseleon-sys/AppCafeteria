import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi.js';

export function registerSwaggerRoutes(app) {
  app.get('/api/docs.json', (req, res) => {
    res.json(openApiSpec);
  });

  app.use(
    '/api/docs',
    (req, res, next) => {
      res.removeHeader('Content-Security-Policy');
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'AppCafeteria API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        tagsSorter: 'alpha',
        operationsSorter: 'method',
      },
    }),
  );
}
