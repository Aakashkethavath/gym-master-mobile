import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import planRoutes from './plan.routes.js';
import trainerRoutes from './trainer.routes.js';
import subscriptionRoutes from './subscription.routes.js';
import attendanceRoutes from './attendance.routes.js';
import workoutRoutes from './workout.routes.js';
import paymentRoutes from './payment.routes.js';
import razorpayRoutes from './razorpay.routes.js';
import exerciseRoutes from './exercise.routes.js';
import feedbackRoutes from './feedback.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/plans', planRoutes);
router.use('/trainers', trainerRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/workouts', workoutRoutes);
router.use('/payments', paymentRoutes);

// Payment gateway — Razorpay + Stripe
// Webhook routes register raw-body middleware internally (before json parser).
router.use('/gateway', razorpayRoutes);

// Exercise API — subscription-gated proxy
router.use('/exercises', exerciseRoutes);

// Feedback API — public/guest
router.use('/feedback', feedbackRoutes);

export default router;
