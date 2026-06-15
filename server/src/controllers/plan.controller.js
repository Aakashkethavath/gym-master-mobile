import { Plan } from '../models/Plan.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listPlans = asyncHandler(async (_req, res) => {
  const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1, monthlyPrice: 1 });
  res.json({ success: true, plans });
});

export const getPlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw ApiError.notFound('Plan not found');
  res.json({ success: true, plan });
});

export const createPlan = asyncHandler(async (req, res) => {
  const plan = await Plan.create(req.body);
  res.status(201).json({ success: true, plan });
});

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!plan) throw ApiError.notFound('Plan not found');
  res.json({ success: true, plan });
});

export const deletePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndDelete(req.params.id);
  if (!plan) throw ApiError.notFound('Plan not found');
  res.json({ success: true });
});
