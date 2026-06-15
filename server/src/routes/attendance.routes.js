import { Router } from 'express';
import {
  checkIn,
  myAttendance,
  attendanceStats,
} from '../controllers/attendance.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { attendanceStatsSchema } from '../validators/index.js';

const router = Router();

router.post('/check-in', requireAuth, checkIn);
router.get('/me', requireAuth, myAttendance);
router.get('/stats', requireAuth, requireAdmin, validate(attendanceStatsSchema), attendanceStats);

export default router;
