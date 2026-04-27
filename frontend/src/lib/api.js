import {
  URL_API,
  URL_API_RESPALDO,
  URLS_API,
  guardarTokensAuth,
  limpiarTokensAuth,
  obtenerTokenAuth,
  obtenerCabecerasAuth,
  gestionarRespuesta,
  peticionApi,
} from '../api/client';
import * as authApi from '../api/auth.api';
import * as productsApi from '../api/products.api';
import * as ordersApi from '../api/orders.api';
import * as familyApi from '../api/family.api';
import * as adminApi from '../api/admin.api';

export {
  URL_API,
  URL_API_RESPALDO,
  URLS_API,
  guardarTokensAuth,
  limpiarTokensAuth,
  obtenerTokenAuth,
  obtenerCabecerasAuth,
  gestionarRespuesta,
  peticionApi,
};

export * from '../api/auth.api';
export * from '../api/products.api';
export * from '../api/orders.api';
export * from '../api/family.api';
export * from '../api/admin.api';

export default {
  URL_API,
  URL_API_RESPALDO,
  URLS_API,
  guardarTokensAuth,
  limpiarTokensAuth,
  obtenerTokenAuth,
  obtenerCabecerasAuth,
  gestionarRespuesta,
  peticionApi,
  ...authApi,
  ...productsApi,
  ...ordersApi,
  ...familyApi,
  ...adminApi,
};
