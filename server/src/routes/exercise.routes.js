/**
 * Exercise routes
 * ───────────────
 * ALL routes below require:
 *  1. A valid JWT (requireAuth)
 *  2. An active paid subscription (requireSubscription)
 *
 * Non-subscribers receive a clear 402/403 response with instructions on
 * how to purchase a plan.
 */
import { Router } from 'express';
import {
  listExercises,
  exercisesByBodyPart,
  exercisesByEquipment,
  searchExercises,
  getExercise,
  bodyPartList,
} from '../controllers/exercise.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireSubscription } from '../middlewares/requireSubscription.js';

const router = Router();

// Meta — no subscription needed (helps the app show what's available)
router.get('/bodyPartList', bodyPartList);

// All of the following require auth + active subscription
router.use(requireAuth, requireSubscription);

router.get('/', listExercises);
router.get('/search', searchExercises);
router.get('/bodyPart/:bodyPart', exercisesByBodyPart);
router.get('/equipment/:equipment', exercisesByEquipment);
router.get('/:id', getExercise);

export default router;
