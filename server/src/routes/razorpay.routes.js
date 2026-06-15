/**
 * Razorpay payment routes
 *
 * IMPORTANT: The webhook endpoint uses express.raw() instead of express.json()
 * because Razorpay's signature verification requires the raw body bytes.
 * The route is registered BEFORE the global json() middleware in app.js.
 */
import { Router } from 'express';
import express from 'express';
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  handleStripeWebhook,
} from '../controllers/razorpay.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimit.js';
import { createOrderSchema, verifyPaymentSchema } from '../validators/index.js';

const router = Router();

// ── Webhook endpoints — raw body required, NO auth ────────────────────────
// These are called by Razorpay/Stripe servers, not by our mobile clients.
router.post(
  '/razorpay/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  handleWebhook,
);

router.post(
  '/stripe/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  handleStripeWebhook,
);

// ── Authenticated client routes ───────────────────────────────────────────

// Stricter rate limit on order creation to prevent order flooding.
router.post(
  '/razorpay/order',
  authLimiter,
  requireAuth,
  validate(createOrderSchema),
  createOrder,
);

router.post(
  '/razorpay/verify',
  authLimiter,
  requireAuth,
  validate(verifyPaymentSchema),
  verifyPayment,
);

export default router;
