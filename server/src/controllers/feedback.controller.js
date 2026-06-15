import { Feedback } from '../models/Feedback.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * List all member feedback sorted by creation date descending.
 */
export const listFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.find()
    .sort({ createdAt: -1 })
    .populate('user', 'name avatar role')
    .lean();

  res.json({
    success: true,
    feedback,
  });
});

/**
 * Submit feedback. If user is authenticated, associate their user record
 * and enforce their registered name. Otherwise, save as guest feedback.
 */
export const createFeedback = asyncHandler(async (req, res) => {
  const { name, rating, comment } = req.body;

  const feedbackData = {
    rating,
    comment,
  };

  if (req.user) {
    feedbackData.user = req.user._id;
    feedbackData.name = req.user.name; // Enforce registered name
  } else {
    feedbackData.name = name; // Use user-provided name for guests
  }

  const feedback = await Feedback.create(feedbackData);

  res.status(201).json({
    success: true,
    feedback,
  });
});
