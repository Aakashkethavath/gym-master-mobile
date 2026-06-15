import { Router } from 'express';
import {
  createSubscription,
  mySubscription,
  listSubscriptions,
} from '../controllers/subscription.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createSubscriptionSchema,
  listSubscriptionsSchema,
} from '../validators/index.js';

const router = Router();

router.post('/', requireAuth, validate(createSubscriptionSchema), createSubscription);
router.get('/me', requireAuth, mySubscription);
router.get('/', requireAuth, requireAdmin, validate(listSubscriptionsSchema), listSubscriptions);

export default router;
