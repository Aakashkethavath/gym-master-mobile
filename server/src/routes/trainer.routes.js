import { Router } from 'express';
import {
  listTrainers,
  getTrainer,
  createTrainer,
  updateTrainer,
  deleteTrainer,
} from '../controllers/trainer.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createTrainerSchema,
  updateTrainerSchema,
  trainerIdParam,
} from '../validators/index.js';

const router = Router();

router.get('/', listTrainers);
router.get('/:id', validate(trainerIdParam), getTrainer);
router.post('/', requireAuth, requireAdmin, validate(createTrainerSchema), createTrainer);
router.patch('/:id', requireAuth, requireAdmin, validate(updateTrainerSchema), updateTrainer);
router.delete('/:id', requireAuth, requireAdmin, validate(trainerIdParam), deleteTrainer);

export default router;
