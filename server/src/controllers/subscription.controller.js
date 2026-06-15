import mongoose from 'mongoose';
import { Subscription } from '../models/Subscription.js';
import { Plan } from '../models/Plan.js';
import { Payment } from '../models/Payment.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Creating a subscription is the canonical "checkout" flow: we validate
 * the plan, compute price + dates atomically, and write a paired Payment
 * record. We wrap both writes in a transaction so the books can never
 * end up with a Subscription that has no Payment (or vice versa).
 */
export const createSubscription = asyncHandler(async (req, res) => {
  const { planId, billing, paymentMethod, gatewayRef } = req.body;

  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) throw ApiError.notFound('Plan not found');

  const amount = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const startDate = new Date();
  const endDate = new Date(startDate);
  if (billing === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
  else endDate.setMonth(endDate.getMonth() + 1);

  // Cancel any other active subscriptions for this user so we have a
  // single "current" plan invariant. Easier to reason about everywhere
  // than allowing overlapping subscriptions.
  const session = await mongoose.startSession();
  let subscription, payment;
  try {
    await session.withTransaction(async () => {
      await Subscription.updateMany(
        { user: req.user._id, status: 'active' },
        { status: 'cancelled' },
        { session },
      );

      [subscription] = await Subscription.create(
        [
          {
            user: req.user._id,
            plan: plan._id,
            billing,
            amount,
            startDate,
            endDate,
            status: 'active',
          },
        ],
        { session },
      );

      [payment] = await Payment.create(
        [
          {
            user: req.user._id,
            subscription: subscription._id,
            amount,
            method: paymentMethod,
            gatewayRef,
            status: 'succeeded',
          },
        ],
        { session },
      );
    });
  } finally {
    session.endSession();
  }

  res.status(201).json({ success: true, subscription, payment });
});

export const mySubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    user: req.user._id,
    status: 'active',
  })
    .populate('plan')
    .sort({ createdAt: -1 });

  res.json({ success: true, subscription });
});

export const listSubscriptions = asyncHandler(async (req, res) => {
  const { page, limit, status, expiringInDays } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (expiringInDays) {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + Number(expiringInDays));
    filter.endDate = { $lte: horizon, $gte: new Date() };
    filter.status = 'active';
  }

  const [items, total] = await Promise.all([
    Subscription.find(filter)
      .populate('user', 'name email avatar')
      .populate('plan', 'name monthlyPrice yearlyPrice')
      .sort({ endDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Subscription.countDocuments(filter),
  ]);

  res.json({ success: true, items, total, page, limit });
});
