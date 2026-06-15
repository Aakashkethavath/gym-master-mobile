/**
 * Exercise Controller
 * ───────────────────
 * All routes here are protected by requireAuth → requireSubscription.
 * Only users with an active paid membership can reach these handlers.
 *
 * The ExerciseDB API key never leaves the server — all requests are proxied
 * through this controller.
 */

import { fetchExercises } from '../services/exercise.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

// ── Validation helpers ────────────────────────────────────────────────────

const ALLOWED_BODY_PARTS = new Set([
  'back', 'cardio', 'chest', 'lower arms', 'lower legs',
  'neck', 'shoulders', 'upper arms', 'upper legs', 'waist',
]);

const ALLOWED_EQUIPMENT = new Set([
  'assisted', 'band', 'barbell', 'body weight', 'bosu ball',
  'cable', 'dumbbell', 'elliptical machine', 'ez barbell',
  'hammer', 'kettlebell', 'leverage machine', 'medicine ball',
  'olympic barbell', 'resistance band', 'roller', 'rope',
  'skierg machine', 'sled machine', 'smith machine', 'stability ball',
  'stationary bike', 'stepmill machine', 'tire', 'trap bar', 'upper body ergometer',
  'weighted', 'wheel roller',
]);

function safePaginationParams(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 50);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}

// ── Handlers ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/exercises
 * Lists exercises with optional pagination.
 * Subscription required.
 */
export const listExercises = asyncHandler(async (req, res) => {
  const { limit, offset } = safePaginationParams(req.query);
  logger.debug({ userId: req.user._id, plan: req.subscription?.plan }, 'Exercise list requested');

  const data = await fetchExercises(`/exercises?limit=${limit}&offset=${offset}`);
  res.json({ success: true, data, limit, offset });
});

/**
 * GET /api/v1/exercises/bodyPart/:bodyPart
 * Filters exercises by body part.
 * Subscription required.
 */
export const exercisesByBodyPart = asyncHandler(async (req, res) => {
  const bodyPart = req.params.bodyPart.toLowerCase().trim();
  if (!ALLOWED_BODY_PARTS.has(bodyPart)) {
    return res.status(400).json({
      success: false,
      message: `Invalid body part. Allowed: ${[...ALLOWED_BODY_PARTS].join(', ')}`,
      code: 'INVALID_BODY_PART',
    });
  }
  const { limit, offset } = safePaginationParams(req.query);
  const data = await fetchExercises(`/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}&offset=${offset}`);
  res.json({ success: true, data, limit, offset });
});

/**
 * GET /api/v1/exercises/equipment/:equipment
 * Filters exercises by equipment type.
 * Subscription required.
 */
export const exercisesByEquipment = asyncHandler(async (req, res) => {
  const equipment = req.params.equipment.toLowerCase().trim();
  if (!ALLOWED_EQUIPMENT.has(equipment)) {
    return res.status(400).json({
      success: false,
      message: `Invalid equipment type`,
      code: 'INVALID_EQUIPMENT',
    });
  }
  const { limit, offset } = safePaginationParams(req.query);
  const data = await fetchExercises(`/exercises/equipment/${encodeURIComponent(equipment)}?limit=${limit}&offset=${offset}`);
  res.json({ success: true, data, limit, offset });
});

/**
 * GET /api/v1/exercises/search?q=bench+press
 * Full-text search by exercise name.
 * Subscription required.
 */
export const searchExercises = asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 100);
  if (!q) return res.status(400).json({ success: false, message: 'q is required', code: 'MISSING_QUERY' });

  const { limit, offset } = safePaginationParams(req.query);
  const data = await fetchExercises(`/exercises/name/${encodeURIComponent(q)}?limit=${limit}&offset=${offset}`);
  res.json({ success: true, data, limit, offset });
});

/**
 * GET /api/v1/exercises/:id
 * Single exercise detail.
 * Subscription required.
 */
export const getExercise = asyncHandler(async (req, res) => {
  // Sanitise the id to prevent path traversal.
  const id = req.params.id.replace(/[^a-zA-Z0-9\-_]/g, '');
  if (!id) return res.status(400).json({ success: false, message: 'Invalid exercise id', code: 'INVALID_ID' });

  const data = await fetchExercises(`/exercises/exercise/${id}`);
  res.json({ success: true, data });
});

/**
 * GET /api/v1/exercises/bodyPartList
 * Returns the list of valid body parts (no subscription needed — meta endpoint).
 */
export const bodyPartList = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: [...ALLOWED_BODY_PARTS].sort() });
});
