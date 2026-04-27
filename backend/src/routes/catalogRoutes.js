import { registerProductRoutes } from './product.routes.js';

// Compatibilidad temporal para imports antiguos: el modulo de catalogo ahora vive en product.*.
export function registerCatalogRoutes(app, deps) {
  return registerProductRoutes(app, deps);
}
