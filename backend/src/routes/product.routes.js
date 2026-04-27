import { crearProductController } from './product.controller.js';
import { crearProductRepository } from './product.repository.js';
import { crearProductService } from './product.service.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { createProductSchema, updateProductSchema } from './product.validators.js';

export function registerProductRoutes(app, deps) {
  const {
    autenticarToken,
    requireAdmin,
  } = deps;

  const repository = crearProductRepository(deps);
  const service = crearProductService(deps, repository);
  const controller = crearProductController(service);

  app.get('/api/products', autenticarToken, requireAdmin, controller.listarProductosAdmin);
  app.get('/api/menu', controller.listarMenuPublico);
  app.post('/api/products', autenticarToken, requireAdmin, validateRequest(createProductSchema), controller.crearProducto);
  app.put('/api/products/:id', autenticarToken, requireAdmin, validateRequest(updateProductSchema), controller.actualizarProducto);
  app.delete('/api/products/:id', autenticarToken, requireAdmin, controller.eliminarProducto);
}
