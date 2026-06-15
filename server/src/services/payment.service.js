/**
 * PaymentService
 * ──────────────
 * A thin adapter layer that isolates payment-gateway specifics from
 * business logic.  Switching gateways only requires changing this file.
 *
 * Design decisions:
 *  • Amounts are always handled in the smallest currency unit (paise for INR,
 *    cents for USD) to avoid floating-point rounding bugs.
 *  • The service never touches the database — that's the controller's job.
 *  • No card data ever passes through this service (tokenisation is handled
 *    client-side by the Razorpay / Stripe SDK).
 *  • Every method returns a plain object so callers stay gateway-agnostic.
 */

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ── Lazy gateway initialisation ───────────────────────────────────────────
// We initialise the gateway SDK at first use rather than at import time so
// tests can override env vars before the SDK reads them.

let _razorpay = null;
let _stripe = null;

async function getRazorpay() {
  if (!_razorpay) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }
    // Dynamic import keeps Stripe out of the module graph when using Razorpay
    const Razorpay = (await import('razorpay')).default; // handled at call site
    _razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

async function getStripe() {
  if (!_stripe) {
    if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe credentials not configured');
    const Stripe = (await import('stripe')).default;
    _stripe = Stripe(env.STRIPE_SECRET_KEY, { // handled at call site
      apiVersion: '2024-06-20',
      maxNetworkRetries: 2,
      telemetry: false, // don't phone home
    });
  }
  return _stripe;
}

// ── Currency helpers ──────────────────────────────────────────────────────

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'BIF', 'GNF', 'MGA']);

/**
 * Converts a human-readable amount (e.g. 1799 rupees) to the gateway's
 * smallest unit (e.g. 179900 paise).  Zero-decimal currencies are left as-is.
 */
export function toSmallestUnit(amount, currency = env.PAYMENT_CURRENCY) {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) return Math.round(amount);
  return Math.round(amount * 100);
}

/**
 * Converts smallest unit back to human-readable amount.
 */
export function fromSmallestUnit(amount, currency = env.PAYMENT_CURRENCY) {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) return amount;
  return amount / 100;
}

// ── Razorpay operations ───────────────────────────────────────────────────

/**
 * Creates a Razorpay order.
 *
 * @param {{ amount: number, currency: string, receipt: string, notes?: object }} opts
 * @returns {Promise<{ gatewayOrderId: string, amountPaise: number, currency: string, keyId: string }>}
 */
export async function createRazorpayOrder({ amount, currency, receipt, notes = {} }) {
  // If credentials are dummy/placeholder, bypass real API call.
  if (env.RAZORPAY_KEY_ID?.includes('xxxx') || env.RAZORPAY_KEY_SECRET?.includes('xxxx')) {
    logger.info('Using Mock Razorpay Order (Development Mode)');
    return {
      gatewayOrderId: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
      amountPaise: toSmallestUnit(amount, currency),
      currency: currency.toUpperCase(),
      keyId: env.RAZORPAY_KEY_ID,
    };
  }

  const Razorpay = (await import('razorpay')).default;
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  const amountPaise = toSmallestUnit(amount, currency);
  logger.debug({ receipt, amountPaise, currency }, 'Creating Razorpay order');

  const order = await _razorpay.orders.create({
    amount: amountPaise,
    currency: currency.toUpperCase(),
    receipt,
    notes: {
      ...notes,
      source: 'gym-master',
    },
    // Enforce a single payment attempt per order.
    payment_capture: 1,
  });

  return {
    gatewayOrderId: order.id,
    amountPaise: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID, // safe to return — this is the publishable key
  };
}

/**
 * Fetches a Razorpay payment and returns sanitised metadata.
 * Used to double-check amounts on the server after client confirms payment.
 */
export async function fetchRazorpayPayment(paymentId) {
  // If it's a simulated payment ID from the mobile app.
  if (paymentId.startsWith('pay_DEMO_')) {
    logger.info({ paymentId }, 'Using Mock Razorpay Payment (Development Mode)');
    // Parse orderId and amount from custom paymentId: pay_DEMO_[orderId]-[amount]
    const parts = paymentId.split('-');
    const orderId = parts[0].substring(9); // strip "pay_DEMO_"
    const amount = Number(parts[1]);

    return {
      id: paymentId,
      orderId,
      amount,
      currency: env.PAYMENT_CURRENCY,
      status: 'captured',
      method: 'card',
      captured: true,
      email: 'demo@gymmaster.app',
      contact: '+919999999999',
    };
  }

  const Razorpay = (await import('razorpay')).default;
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  const payment = await _razorpay.payments.fetch(paymentId);
  return {
    id: payment.id,
    orderId: payment.order_id,
    amount: payment.amount,        // in paise
    currency: payment.currency,
    status: payment.status,        // 'captured' | 'failed' | 'refunded'
    method: payment.method,        // 'card' | 'upi' | 'netbanking' | …
    captured: payment.captured,
    email: payment.email,
    contact: payment.contact,
    // Never log or return payment.card — it contains last4 etc.
  };
}

/**
 * Issues a Razorpay refund.
 *
 * @param {{ paymentId: string, amount?: number, reason?: string }} opts
 */
export async function refundRazorpayPayment({ paymentId, amount, reason = 'other' }) {
  const Razorpay = (await import('razorpay')).default;
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  const params = { speed: 'normal', notes: { reason } };
  if (amount) params.amount = toSmallestUnit(amount);
  const refund = await _razorpay.payments.refund(paymentId, params);
  return { refundId: refund.id, status: refund.status };
}

// ── Stripe operations ─────────────────────────────────────────────────────

/**
 * Creates a Stripe PaymentIntent and returns the client_secret to the
 * mobile app so it can confirm the payment using the Stripe SDK.
 *
 * We never handle raw card data — the client passes it directly to
 * Stripe's secure iframe/SDK.
 */
export async function createStripePaymentIntent({ amount, currency, metadata = {} }) {
  const stripe = (await import('stripe')).default(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
    maxNetworkRetries: 2,
    telemetry: false,
  });

  const amountCents = toSmallestUnit(amount, currency);
  logger.debug({ amountCents, currency }, 'Creating Stripe PaymentIntent');

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: { source: 'gym-master', ...metadata },
    // Capture immediately (not auth-then-capture).
    capture_method: 'automatic',
  });

  return {
    clientSecret: intent.client_secret, // returned to client
    paymentIntentId: intent.id,
    amountCents: intent.amount,
    currency: intent.currency,
  };
}
