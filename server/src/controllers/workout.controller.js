import { Workout } from '../models/Workout.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createWorkout = asyncHandler(async (req, res) => {
  const workout = await Workout.create({ ...req.body, user: req.user._id });
  res.status(201).json({ success: true, workout });
});

export const myWorkouts = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const [items, total] = await Promise.all([
    Workout.find({ user: req.user._id })
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Workout.countDocuments({ user: req.user._id }),
  ]);
  res.json({ success: true, items, total, page, limit });
});
