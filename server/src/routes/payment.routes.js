import { Router } from 'express';
import { myPayments, allPayments } from '../controllers/payment.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { listPaymentsSchema } from '../validators/index.js';

const router = Router();

router.get('/me', requireAuth, validate(listPaymentsSchema), myPayments);
router.get('/', requireAuth, requireAdmin, validate(listPaymentsSchema), allPayments);

export default router;
