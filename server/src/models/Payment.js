import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'cash', 'wallet', 'other'],
      default: 'card',
    },
    // Identifier from the payment gateway (Razorpay, Stripe, etc).
    // Marked sparse + unique so duplicates can't be silently inserted
    // by a webhook retry.
    gatewayRef: { type: String, sparse: true, unique: true },
    status: {
      type: String,
      enum: ['succeeded', 'pending', 'failed', 'refunded'],
      default: 'succeeded',
      index: true,
    },
  },
  { timestamps: true },
);

export const Payment = mongoose.model('Payment', paymentSchema);
