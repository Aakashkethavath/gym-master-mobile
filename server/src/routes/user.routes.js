import { Router } from 'express';
import { updateMe, listUsers, totalUsers } from '../controllers/user.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { updateMeSchema } from '../validators/index.js';

const router = Router();

router.patch('/me', requireAuth, validate(updateMeSchema), updateMe);
router.get('/', requireAuth, requireAdmin, listUsers);
router.get('/stats/total', requireAuth, requireAdmin, totalUsers);

export default router;
