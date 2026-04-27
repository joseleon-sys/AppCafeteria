import Stripe from 'stripe';
import { estaActivoSaltoPagoDesarrollo } from './env.js';
import { parsearValorBooleano } from '../utils/utilidadesApp.js';

export function isStripeSecretKey(key) {
  return /^(sk|rk)_(test|live)_/.test(String(key || '').trim());
}

export function createStripeConfig({ isProduction, isHosted }) {
  const bypassRequestedInDisabledEnvironment =
    (isProduction || isHosted) && parsearValorBooleano(process.env.DEV_BYPASS_STRIPE_PAYMENT, false);
  const developmentPaymentBypassEnabled = estaActivoSaltoPagoDesarrollo({ isProduction, isHosted });
  const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  const hasInvalidStripeSecretKey = Boolean(stripeSecretKey) && !isStripeSecretKey(stripeSecretKey);

  if (bypassRequestedInDisabledEnvironment) {
    console.warn('DEV_BYPASS_STRIPE_PAYMENT esta activo en produccion/Railway, pero se ignorara para no saltar Stripe.');
  }

  if (hasInvalidStripeSecretKey) {
    const message = 'STRIPE_SECRET_KEY debe ser una clave de servidor de Stripe (sk_test_..., sk_live_..., rk_test_... o rk_live_...), no una clave publicable pk_...';
    if ((isProduction || isHosted) && !developmentPaymentBypassEnabled) {
      throw new Error(message);
    }
    console.warn(`${message}. Stripe quedara deshabilitado hasta definir una clave valida.`);
  }

  if (!stripeSecretKey) {
    if ((isProduction || isHosted) && !developmentPaymentBypassEnabled) {
      throw new Error('STRIPE_SECRET_KEY es obligatorio en produccion/Railway para no saltar la pasarela de pago');
    }
    console.warn('STRIPE_SECRET_KEY no configurado. Stripe quedara deshabilitado hasta definir la clave.');
  }

  return {
    stripe: stripeSecretKey && !hasInvalidStripeSecretKey ? new Stripe(stripeSecretKey) : null,
    developmentPaymentBypassEnabled,
  };
}
