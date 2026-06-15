import 'dotenv/config';
import { z } from 'zod';

/**
 * Single source of truth for all runtime configuration.
 * Zod validates types + required fields at startup so the process
 * fails fast with a clear message rather than dying later with a
 * cryptic undefined reference.
 *
 * Security notes
 * ──────────────
 * • Payment secrets are loaded from Docker secrets files when
 *   *_FILE env vars are set (standard Docker secrets pattern).
 * • Nothing here is ever logged or serialised to JSON.
 */

// ── Docker secrets helper ─────────────────────────────────────────────────

// Synchronous secret reader used at module load time.
import { readFileSync } from 'node:fs';
function secret(key) {
  const filePath = process.env[`${key}_FILE`];
  if (filePath) {
    try {
      return readFileSync(filePath, 'utf8').trim();
    } catch (e) {
      console.error(`❌  Cannot read Docker secret for ${key} from ${filePath}: ${e.message}`);
      process.exit(1);
    }
  }
  return process.env[key];
}

// Inject resolved secrets back into process.env so Zod can validate them.
const SECRETS = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'EXERCISE_API_KEY',
  'MONGODB_URI',
];
for (const k of SECRETS) {
  const v = secret(k);
  if (v) process.env[k] = v;
}

// ── Schema ────────────────────────────────────────────────────────────────
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // ── Razorpay (primary payment gateway) ──────────────────────────────
  // key_id is safe to expose to clients; key_secret MUST stay server-side.
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  // Razorpay signs webhook payloads with HMAC-SHA256 using this secret.
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),

  // ── Stripe (secondary / international payments) ──────────────────────
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
  // Stripe CLI or dashboard webhook signing secret.
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

  // ── Payment behaviour ────────────────────────────────────────────────
  // Which gateway is active. Must have the matching credentials set.
  PAYMENT_GATEWAY: z.enum(['razorpay', 'stripe']).default('razorpay'),
  // ISO-4217 currency code.
  PAYMENT_CURRENCY: z.string().length(3).default('INR'),

  // ── Exercise proxy ───────────────────────────────────────────────────
  // RapidAPI key for ExerciseDB — never exposed to mobile clients.
  EXERCISE_API_KEY: z.string().optional(),
  EXERCISE_API_HOST: z.string().default('exercisedb.p.rapidapi.com'),

  // ── Audit ─────────────────────────────────────────────────────────────
  // Retain audit log entries for this many days (MongoDB TTL index).
  AUDIT_LOG_TTL_DAYS: z.coerce.number().int().positive().default(365),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment configuration:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
