import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import { parsearValorBooleano } from '../utils/utilidadesApp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadEnvironment() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  dotenv.config({ path: path.join(__dirname, '../../../.env'), override: false });
}

export function esDespliegueAlojado() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_STATIC_URL,
  );
}

export function estaActivoSaltoPagoDesarrollo({
  isProduction = process.env.NODE_ENV === 'production',
  isHosted = esDespliegueAlojado(),
} = {}) {
  if (isProduction || isHosted) {
    return false;
  }

  return parsearValorBooleano(process.env.DEV_BYPASS_STRIPE_PAYMENT, false);
}

export function createRuntimeConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHosted = esDespliegueAlojado();
  const jwtSecret = process.env.JWT_SECRET || (!isProduction ? randomBytes(32).toString('hex') : null);

  if (!process.env.JWT_SECRET) {
    if (isProduction) throw new Error('JWT_SECRET es obligatorio en producción');
    console.warn('JWT_SECRET no configurado. Se usa una clave temporal de desarrollo.');
  }

  return {
    port: process.env.PORT || 3000,
    isProduction,
    isHosted,
    jwtSecret,
  };
}
