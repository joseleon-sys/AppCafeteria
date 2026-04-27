// Este archivo monta la aplicacion Express completa:
// crea el contexto compartido y registra todas las rutas y manejadores globales.
import { crearContextoApp } from '../appContext.js';
import { registerErrorHandler, registerNotFoundHandler, registerSystemRoutes } from '../routes/systemRoutes.js';
import { registerAuthRoutes } from '../routes/auth.routes.js';
import { registerOrderRoutes } from '../routes/order.routes.js';
import { registerFamilyRoutes } from '../modules/family/family.routes.js';
import { registerProductRoutes } from '../routes/product.routes.js';
import { registerAdminRoutes } from '../modules/admin/admin.routes.js';
import { registerChildOrderRoutes } from '../modules/childOrders/childOrders.routes.js';
import { registerSentryErrorHandler } from '../observability/sentry.js';
import { registerSwaggerRoutes } from '../docs/swagger.routes.js';

export function createServerApp() {
  // Construimos una sola vez todo lo comun que las rutas necesitan.
  const context = crearContextoApp();
  const { app } = context;

  // Aqui se van conectando los distintos grupos de endpoints.
  registerSystemRoutes(app);
  registerAuthRoutes(app, context);
  registerOrderRoutes(app, context);
  registerFamilyRoutes(app, context);
  registerProductRoutes(app, context);
  registerAdminRoutes(app, context);
  registerChildOrderRoutes(app, context);
  registerSwaggerRoutes(app);
  registerSentryErrorHandler(app);
  registerNotFoundHandler(app);
  registerErrorHandler(app);

  // Devolvemos tanto la app como el resto del contexto para arrancar el servidor.
  return context;
}
