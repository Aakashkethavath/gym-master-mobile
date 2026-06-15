import { z } from 'zod';

// ---------- shared ----------

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ---------- auth ----------

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(60),
    email: z.string().trim().toLowerCase().email(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/\d/, 'Must contain a digit'),
    contact: z.string().trim().min(7).max(20).optional(),
    city: z.string().trim().min(2).max(60).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1) }),
});

// ---------- users ----------

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(60).optional(),
    contact: z.string().trim().min(7).max(20).optional(),
    city: z.string().trim().min(2).max(60).optional(),
    avatar: z.string().url().optional(),
  }),
});

// ---------- plans ----------

const planFeatures = z
  .object({
    waterStations: z.boolean(),
    lockerRooms: z.boolean(),
    wifi: z.boolean(),
    cardioClasses: z.boolean(),
    refreshments: z.boolean(),
    groupClasses: z.boolean(),
    personalTrainer: z.boolean(),
    specialEvents: z.boolean(),
    cafe: z.boolean(),
  })
  .partial();

export const createPlanSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(60),
    tagline: z.string().trim().max(120).optional(),
    description: z.string().trim().max(1000).optional(),
    monthlyPrice: z.number().nonnegative(),
    yearlyPrice: z.number().nonnegative(),
    features: planFeatures.optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }),
});

export const updatePlanSchema = z.object({
  params: z.object({ id: objectId }),
  body: createPlanSchema.shape.body.partial(),
});

export const planIdParam = z.object({ params: z.object({ id: objectId }) });

// ---------- trainers ----------

export const createTrainerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(60),
    specialization: z.string().trim().min(2).max(60),
    bio: z.string().trim().max(1000).optional(),
    experienceYears: z.number().int().nonnegative().max(80).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    avatar: z.string().url().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateTrainerSchema = z.object({
  params: z.object({ id: objectId }),
  body: createTrainerSchema.shape.body.partial(),
});

export const trainerIdParam = z.object({ params: z.object({ id: objectId }) });

// ---------- subscriptions ----------

export const createSubscriptionSchema = z.object({
  body: z.object({
    planId: objectId,
    billing: z.enum(['monthly', 'yearly']),
    paymentMethod: z
      .enum(['card', 'upi', 'netbanking', 'cash', 'wallet', 'other'])
      .default('card'),
    gatewayRef: z.string().min(1).optional(),
  }),
});

export const listSubscriptionsSchema = z.object({
  query: paginationQuery.extend({
    status: z.enum(['active', 'expired', 'cancelled']).optional(),
    expiringInDays: z.coerce.number().int().positive().max(365).optional(),
  }),
});

// ---------- attendance ----------

export const attendanceStatsSchema = z.object({
  query: z.object({
    days: z.coerce.number().int().positive().max(365).default(30),
  }),
});

// ---------- workouts ----------

export const createWorkoutSchema = z.object({
  body: z.object({
    date: z.coerce.date().optional(),
    type: z
      .enum(['strength', 'cardio', 'hiit', 'yoga', 'crossfit', 'other'])
      .default('strength'),
    durationMinutes: z.number().int().nonnegative().max(600).default(0),
    caloriesBurned: z.number().int().nonnegative().max(10_000).default(0),
    exercises: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(60),
          sets: z.number().int().nonnegative().max(50).default(0),
          reps: z.number().int().nonnegative().max(1000).default(0),
          weightKg: z.number().nonnegative().max(1000).default(0),
        }),
      )
      .default([]),
    notes: z.string().trim().max(1000).optional(),
  }),
});

export const listWorkoutsSchema = z.object({ query: paginationQuery });
export const listPaymentsSchema = z.object({ query: paginationQuery });

// ---------- razorpay ----------

export const createOrderSchema = z.object({
  body: z.object({
    planId: objectId,
    billing: z.enum(['monthly', 'yearly']),
    idempotencyKey: z
      .string()
      .uuid('idempotencyKey must be a UUID v4')
      .optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().startsWith('order_', 'Must be a Razorpay order ID'),
    razorpay_payment_id: z.string().startsWith('pay_', 'Must be a Razorpay payment ID'),
    razorpay_signature: z.string().refine(
      (val) => val.length === 64 || val === 'DEMO_SIGNATURE_REPLACE_WITH_REAL_IN_PRODUCTION',
      { message: 'Signature must be 64 hex chars or the demo signature' }
    ),
  }),
});

// ---------- feedback ----------

export const createFeedbackSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name must not exceed 60 characters'),
    rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
    comment: z.string().trim().min(2, 'Comment must be at least 2 characters').max(400, 'Comment must not exceed 400 characters'),
  }),
});

