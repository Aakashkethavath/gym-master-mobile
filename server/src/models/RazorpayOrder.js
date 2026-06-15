import mongoose from 'mongoose';

/**
 * Mirrors a Razorpay Order object on our side.
 *
 * Why we need this:
 * 1. Idempotency — prevents the same client request from creating two orders.
 * 2. Amount integrity — we verify that the amount the client claims to have
 *    paid matches what WE set on the order, not what the client sends us.
 * 3. Audit trail — we can trace every order even if the webhook is delayed.
 *
 * Lifecycle: created → paid (webhook) | failed | expired
 */
const razorpayOrderSchema = new mongoose.Schema(
  {
    // Our internal references
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    billing: { type: String, enum: ['monthly', 'yearly'], required: true },

    // Razorpay-assigned order ID (their primary key)
    gatewayOrderId: { type: String, required: true, unique: true, index: true },

    // Amount in the smallest currency unit (paise for INR).
    // We store this so we can verify the client isn't manipulating the amount.
    amountPaise: { type: Number, required: true },
    currency: { type: String, required: true, default: 'INR' },

    status: {
      type: String,
      enum: ['created', 'attempted', 'paid', 'failed', 'expired'],
      default: 'created',
      index: true,
    },

    // Populated when Razorpay confirms payment
    gatewayPaymentId: { type: String, sparse: true },
    gatewaySignature: { type: String },

    // Idempotency key sent by the client — prevents duplicate order creation
    // if the network drops and the client retries.
    idempotencyKey: { type: String, sparse: true, unique: true },

    // Created Subscription after successful payment
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },

    // TTL: expire unconfirmed orders after 30 minutes.
    // Razorpay orders themselves expire after 15 minutes by default.
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true },
);

export const RazorpayOrder = mongoose.model('RazorpayOrder', razorpayOrderSchema);
