import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'contact', 'city', 'avatar'];
  const patch = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k)),
  );

  Object.assign(req.user, patch);
  await req.user.save();
  res.json({ success: true, user: req.user });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, users });
});

export const totalUsers = asyncHandler(async (_req, res) => {
  const total = await User.countDocuments({ role: 'client' });
  res.json({ success: true, total });
});
