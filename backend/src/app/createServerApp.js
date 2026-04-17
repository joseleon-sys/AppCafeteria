import { createAppContext } from '../appContext.js';
import { registerErrorHandler, registerNotFoundHandler, registerSystemRoutes } from '../routes/systemRoutes.js';
import { registerAuthRoutes } from '../routes/authRoutes.js';
import { registerOrderRoutes } from '../routes/orderRoutes.js';
import { registerFamilyRoutes } from '../routes/familyRoutes.js';
import { registerCatalogRoutes } from '../routes/catalogRoutes.js';
import { registerAdminRoutes } from '../routes/adminRoutes.js';
import { registerChildOrderRoutes } from '../routes/childOrderRoutes.js';
import { registerSentryErrorHandler } from '../observability/sentry.js';

export function createServerApp() {
  const context = createAppContext();
  const { app } = context;

  registerSystemRoutes(app);
  registerAuthRoutes(app, context);
  registerOrderRoutes(app, context);
  registerFamilyRoutes(app, context);
  registerCatalogRoutes(app, context);
  registerAdminRoutes(app, context);
  registerChildOrderRoutes(app, context);
  registerSentryErrorHandler(app);
  registerNotFoundHandler(app);
  registerErrorHandler(app);

  return context;
}
