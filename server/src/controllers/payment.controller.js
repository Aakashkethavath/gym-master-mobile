import { Payment } from '../models/Payment.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const myPayments = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const [items, total] = await Promise.all([
    Payment.find({ user: req.user._id, status: 'succeeded' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('subscription', 'billing startDate endDate'),
    Payment.countDocuments({ user: req.user._id, status: 'succeeded' }),
  ]);
  res.json({ success: true, items, total, page, limit });
});

export const allPayments = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  // Bookkeeping summary: total revenue + revenue this month.
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [items, total, revenueAgg, monthAgg] = await Promise.all([
    Payment.find({ status: 'succeeded' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email')
      .populate('subscription', 'billing'),
    Payment.countDocuments({ status: 'succeeded' }),
    Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'succeeded', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    success: true,
    items,
    total,
    page,
    limit,
    totalRevenue: revenueAgg[0]?.sum ?? 0,
    monthRevenue: monthAgg[0]?.sum ?? 0,
  });
});
