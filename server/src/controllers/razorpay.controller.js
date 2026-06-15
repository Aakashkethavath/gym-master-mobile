/**
 * Razorpay Payment Controller
 * ───────────────────────────
 * Implements the full Razorpay payment lifecycle:
 *
 *   Step 1 – Client calls POST /api/v1/payments/razorpay/order
 *             → We create a Razorpay Order and return {orderId, amount, keyId}
 *             → Client shows Razorpay checkout
 *
 *   Step 2 – Customer pays on Razorpay checkout (handled by Razorpay SDK in the app)
 *             → Razorpay returns {razorpay_order_id, razorpay_payment_id, razorpay_signature}
 *
 *   Step 3 – Client calls POST /api/v1/payments/razorpay/verify
 *             → We verify the HMAC signature server-side (critical security step)
 *             → We fetch the payment from Razorpay to confirm amount & status
 *             → We create Subscription + Payment records in a Mongo transaction
 *
 * Webhook – Razorpay calls POST /api/v1/payments/razorpay/webhook
 *           → Independent confirmation path for network failures
 *           → Signature verified before any processing
 *
 * Security:
 *   • Amounts are SET by the server, never trusted from the client.
 *   • Payment signature is verified server-side before any DB writes.
 *   • Idempotency keys prevent duplicate orders on network retry.
 *   • All events are written to AuditLog.
 *   • Webhook uses raw body for signature verification.
 */

import mongoose from 'mongoose';
import { Plan } from '../models/Plan.js';
import { Subscription } from '../models/Subscription.js';
import { Payment } from '../models/Payment.js';
import { RazorpayOrder } from '../models/RazorpayOrder.js';
import { AuditLog } from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { redact, isValidIdempotencyKey } from '../utils/crypto.js';
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  fromSmallestUnit,
} from '../services/payment.service.js';
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhook,
} from '../utils/crypto.js';
import { env } from '../config/env.js';

// ── Helpers ───────────────────────────────────────────────────────────────

function clientIp(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
}

async function buildSubscription(session, userId, order) {
  const plan = await Plan.findById(order.plan).session(session);
  if (!plan || !plan.isActive) throw ApiError.notFound('Plan not found');

  const amount = fromSmallestUnit(order.amountPaise, order.currency);
  const startDate = new Date();
  const endDate = new Date(startDate);
  if (order.billing === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
  else endDate.setMonth(endDate.getMonth() + 1);

  // Cancel any existing active subscriptions (single-plan invariant).
  await Subscription.updateMany(
    { user: userId, status: 'active' },
    { status: 'cancelled' },
    { session },
  );

  const [sub] = await Subscription.create(
    [{ user: userId, plan: plan._id, billing: order.billing, amount, startDate, endDate, status: 'active' }],
    { session },
  );
  return { sub, amount, plan };
}

// ── Step 1: Create order ──────────────────────────────────────────────────

export const createOrder = asyncHandler(async (req, res) => {
  const { planId, billing, idempotencyKey } = req.body;

  // Validate idempotency key format (UUID v4 expected from client).
  if (idempotencyKey && !isValidIdempotencyKey(idempotencyKey)) {
    throw ApiError.badRequest('Invalid idempotency key format', 'INVALID_IDEMPOTENCY_KEY');
  }

  // Idempotency: return existing order if this key was already used.
  if (idempotencyKey) {
    const existing = await RazorpayOrder.findOne({ idempotencyKey, user: req.user._id });
    if (existing && existing.status === 'created') {
      logger.info({ orderId: existing.gatewayOrderId }, 'Returning idempotent order');
      return res.json({
        success: true,
        orderId: existing.gatewayOrderId,
        amountPaise: existing.amountPaise,
        currency: existing.currency,
        keyId: env.RAZORPAY_KEY_ID,
        idempotent: true,
      });
    }
  }

  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) throw ApiError.notFound('Plan not found');

  // Server determines the amount — never trust the client's amount.
  const amount = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const currency = env.PAYMENT_CURRENCY;
  const receipt = `sub_${req.user._id.toString().slice(-8)}_${Date.now()}`;

  const gateway = await createRazorpayOrder({
    amount,
    currency,
    receipt,
    notes: {
      userId: req.user._id.toString(),
      planId: plan._id.toString(),
      billing,
    },
  });

  // Persist the order so we can verify amounts on step 3.
  const dbOrder = await RazorpayOrder.create({
    user: req.user._id,
    plan: plan._id,
    billing,
    gatewayOrderId: gateway.gatewayOrderId,
    amountPaise: gateway.amountPaise,
    currency: gateway.currency,
    idempotencyKey: idempotencyKey || undefined,
  });

  await AuditLog.log({
    user: req.user._id,
    category: 'payment',
    action: 'order.created',
    description: `Order created for ${plan.name} (${billing})`,
    status: 'success',
    meta: { orderId: gateway.gatewayOrderId, plan: plan.name, billing, amount },
    ip: clientIp(req),
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({
    success: true,
    orderId: gateway.gatewayOrderId,
    amountPaise: gateway.amountPaise,
    currency: gateway.currency,
    keyId: gateway.keyId,
  });
});

// ── Step 3: Verify payment ────────────────────────────────────────────────

export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // ── Security check 1: Verify HMAC-SHA256 signature ──────────────────
  // This is the primary payment authenticity check. If the signature is
  // invalid, we reject immediately — no DB lookups, no money movement.
  const isValid = verifyRazorpayPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    env.RAZORPAY_KEY_SECRET,
  );

  if (!isValid) {
    await AuditLog.log({
      user: req.user._id,
      category: 'security',
      action: 'payment.signature_invalid',
      description: 'Razorpay payment signature verification failed',
      status: 'failure',
      meta: { orderId: razorpay_order_id },
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
    });
    throw ApiError.badRequest('Invalid payment signature', 'INVALID_SIGNATURE');
  }

  // ── Security check 2: Find and validate our order record ─────────────
  const order = await RazorpayOrder.findOne({
    gatewayOrderId: razorpay_order_id,
    user: req.user._id,
  });

  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  if (order.status === 'paid') {
    // Already processed — return existing subscription (idempotent).
    const sub = await Subscription.findById(order.subscription).populate('plan');
    return res.json({ success: true, subscription: sub, idempotent: true });
  }
  if (order.status === 'expired') {
    throw ApiError.badRequest('Order has expired', 'ORDER_EXPIRED');
  }

  // ── Security check 3: Verify amount with gateway ─────────────────────
  // Never trust the client — fetch the payment from Razorpay to confirm
  // the actual captured amount matches our order.
  const gatewayPayment = await fetchRazorpayPayment(razorpay_payment_id);

  if (gatewayPayment.orderId !== razorpay_order_id) {
    throw ApiError.badRequest('Payment does not match order', 'AMOUNT_MISMATCH');
  }
  if (gatewayPayment.amount !== order.amountPaise) {
    await AuditLog.log({
      user: req.user._id,
      category: 'security',
      action: 'payment.amount_tampered',
      description: 'Captured amount differs from ordered amount',
      status: 'failure',
      meta: {
        orderId: razorpay_order_id,
        expected: order.amountPaise,
        received: gatewayPayment.amount,
      },
      ip: clientIp(req),
    });
    throw ApiError.badRequest('Payment amount mismatch', 'AMOUNT_MISMATCH');
  }
  if (gatewayPayment.status !== 'captured') {
    throw ApiError.badRequest(`Payment not captured (status: ${gatewayPayment.status})`, 'NOT_CAPTURED');
  }

  // ── All checks passed — create Subscription + Payment in a transaction ─
  const session = await mongoose.startSession();
  let subscription, payment;

  try {
    await session.withTransaction(async () => {
      const { sub, amount, plan } = await buildSubscription(session, req.user._id, order);
      subscription = sub;

      [payment] = await Payment.create(
        [{
          user: req.user._id,
          subscription: sub._id,
          amount,
          currency: order.currency,
          method: gatewayPayment.method ?? 'card',
          gatewayRef: razorpay_payment_id,
          status: 'succeeded',
        }],
        { session },
      );

      // Mark our order record as paid.
      order.status = 'paid';
      order.gatewayPaymentId = razorpay_payment_id;
      order.gatewaySignature = razorpay_signature;
      order.subscription = sub._id;
      await order.save({ session });
    });
  } finally {
    session.endSession();
  }

  await AuditLog.log({
    user: req.user._id,
    category: 'payment',
    action: 'payment.verified',
    description: `Payment verified for order ${razorpay_order_id}`,
    status: 'success',
    meta: {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      method: gatewayPayment.method,
    },
    ip: clientIp(req),
  });

  res.json({ success: true, subscription: await subscription.populate('plan'), payment });
});

// ── Webhook handler ───────────────────────────────────────────────────────

/**
 * Razorpay delivers webhook events asynchronously. This provides a
 * reliable second confirmation path even if the client crashes mid-checkout.
 *
 * IMPORTANT: this route must receive the RAW body (not JSON-parsed) for
 * signature verification. See app.js where we use express.raw() for this
 * path before the global json() middleware.
 */
export const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  // ── Security: verify webhook signature first ─────────────────────────
  if (!signature) {
    return res.status(400).json({ success: false, message: 'Missing signature' });
  }

  const isValid = verifyRazorpayWebhook(
    req.body, // raw Buffer (see app.js)
    signature,
    env.RAZORPAY_WEBHOOK_SECRET,
  );

  if (!isValid) {
    logger.warn('Razorpay webhook signature invalid');
    await AuditLog.log({
      category: 'webhook',
      action: 'webhook.signature_invalid',
      description: 'Razorpay webhook rejected — invalid signature',
      status: 'failure',
      ip: clientIp(req),
    });
    // Return 200 to prevent Razorpay from retrying (we've already rejected it).
    return res.status(200).json({ success: false, message: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  const eventName = event.event;
  const payload = event.payload?.payment?.entity ?? {};

  logger.info({ eventName, orderId: payload.order_id }, 'Razorpay webhook received');

  await AuditLog.log({
    category: 'webhook',
    action: `webhook.${eventName}`,
    description: `Razorpay webhook: ${eventName}`,
    status: 'success',
    meta: redact({ eventName, orderId: payload.order_id, paymentId: payload.id }),
  });

  // ── Handle specific events ───────────────────────────────────────────
  switch (eventName) {
    case 'payment.captured': {
      // Idempotent: only process if the order isn't already marked paid.
      const order = await RazorpayOrder.findOne({ gatewayOrderId: payload.order_id });
      if (!order || order.status === 'paid') break;

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const { sub, amount } = await buildSubscription(session, order.user, order);
          await Payment.create(
            [{
              user: order.user,
              subscription: sub._id,
              amount,
              currency: payload.currency,
              method: payload.method ?? 'card',
              gatewayRef: payload.id,
              status: 'succeeded',
            }],
            { session },
          );
          order.status = 'paid';
          order.gatewayPaymentId = payload.id;
          order.subscription = sub._id;
          await order.save({ session });
        });
      } finally {
        session.endSession();
      }
      break;
    }

    case 'payment.failed': {
      const order = await RazorpayOrder.findOne({ gatewayOrderId: payload.order_id });
      if (order && order.status !== 'paid') {
        order.status = 'failed';
        await order.save();
      }
      break;
    }

    case 'refund.processed': {
      const refundEntity = event.payload?.refund?.entity ?? {};
      await Payment.findOneAndUpdate(
        { gatewayRef: refundEntity.payment_id },
        { status: 'refunded' },
      );
      break;
    }

    default:
      logger.debug({ eventName }, 'Unhandled Razorpay webhook event');
  }

  // Always return 200 quickly so Razorpay doesn't retry.
  res.status(200).json({ success: true });
});

// ── Stripe webhook handler ────────────────────────────────────────────────

export const handleStripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ success: false, message: 'Missing signature' });

  const { verifyStripeWebhook } = await import('../utils/crypto.js');
  const valid = verifyStripeWebhook(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    logger.warn('Stripe webhook signature invalid');
    return res.status(200).json({ success: false, message: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false });
  }

  logger.info({ type: event.type }, 'Stripe webhook received');

  await AuditLog.log({
    category: 'webhook',
    action: `stripe.${event.type}`,
    description: `Stripe webhook: ${event.type}`,
    status: 'success',
    meta: { eventId: event.id },
  });

  res.status(200).json({ success: true });
});
