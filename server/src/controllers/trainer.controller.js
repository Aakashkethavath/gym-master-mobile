import { Trainer } from '../models/Trainer.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listTrainers = asyncHandler(async (_req, res) => {
  const trainers = await Trainer.find({ isActive: true }).sort({ createdAt: -1 });
  res.json({ success: true, trainers });
});

export const getTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.params.id);
  if (!trainer) throw ApiError.notFound('Trainer not found');
  res.json({ success: true, trainer });
});

export const createTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.create(req.body);
  res.status(201).json({ success: true, trainer });
});

export const updateTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!trainer) throw ApiError.notFound('Trainer not found');
  res.json({ success: true, trainer });
});

export const deleteTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findByIdAndDelete(req.params.id);
  if (!trainer) throw ApiError.notFound('Trainer not found');
  res.json({ success: true });
});
