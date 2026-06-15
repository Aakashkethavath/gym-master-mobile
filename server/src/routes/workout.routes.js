import { Router } from 'express';
import { createWorkout, myWorkouts } from '../controllers/workout.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createWorkoutSchema, listWorkoutsSchema } from '../validators/index.js';

const router = Router();

router.post('/', requireAuth, validate(createWorkoutSchema), createWorkout);
router.get('/me', requireAuth, validate(listWorkoutsSchema), myWorkouts);

export default router;
