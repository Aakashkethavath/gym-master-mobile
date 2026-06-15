import { Router } from 'express';
import {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
} from '../controllers/plan.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createPlanSchema,
  updatePlanSchema,
  planIdParam,
} from '../validators/index.js';

const router = Router();

router.get('/', listPlans); // public — catalogue
router.get('/:id', validate(planIdParam), getPlan);
router.post('/', requireAuth, requireAdmin, validate(createPlanSchema), createPlan);
router.patch('/:id', requireAuth, requireAdmin, validate(updatePlanSchema), updatePlan);
router.delete('/:id', requireAuth, requireAdmin, validate(planIdParam), deletePlan);

export default router;
