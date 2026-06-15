import { Router } from 'express';
import { listFeedback, createFeedback } from '../controllers/feedback.controller.js';
import { optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createFeedbackSchema } from '../validators/index.js';

const router = Router();

router.get('/', listFeedback);
router.post('/', optionalAuth, validate(createFeedbackSchema), createFeedback);

export default router;
