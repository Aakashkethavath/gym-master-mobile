/**
 * Express application factory.
 *
 * Design:
 *  • Webhook routes (Razorpay, Stripe) receive raw body bytes — they are
 *    mounted BEFORE the global json() middleware using a path-specific
 *    express.raw() override inside their router.
 *  • The audit middleware attaches req.audit() to every request so
 *    controllers can write audit entries without boilerplate.
 *  • Security headers via Helmet; strict CORS; global API rate limit.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/error.js';
import { apiLimiter } from './middlewares/rateLimit.js';
import { attachAudit } from './middlewares/auditLog.js';
import routes from './routes/index.js';

export function createApp() {
  const app = express();

  // Trust proxy headers (Nginx, load balancers, Render, Heroku, etc.)
  app.set('trust proxy', 1);

  // ── Security headers ─────────────────────────────────────────────────
  app.use(
    helmet({
      // Allow inline scripts only for the Razorpay checkout (not needed on
      // the API itself, but good to document the policy).
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
          connectSrc: ["'self'", 'https://api.razorpay.com'],
          frameSrc: ["'self'", 'https://api.razorpay.com'],
        },
      },
      // Force HTTPS for 1 year in production.
      hsts: env.NODE_ENV === 'production'
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────
  const origins =
    env.CORS_ORIGIN === '*'
      ? true
      : env.CORS_ORIGIN.split(',').map((s) => s.trim());
  app.use(cors({ origin: origins, credentials: true }));

  // ── Body parsing ──────────────────────────────────────────────────────
  // NOTE: Webhook routes mount their own express.raw() BEFORE this json()
  // middleware fires, so they receive the raw body needed for HMAC verification.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── Logging ───────────────────────────────────────────────────────────
  app.use(
    morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    }),
  );

  // ── Attach audit helper to every request ─────────────────────────────
  app.use(attachAudit);

  // ── Rate limiting ─────────────────────────────────────────────────────
  app.use('/api', apiLimiter);

  // ── Routes ────────────────────────────────────────────────────────────
  app.use('/api/v1', routes);

  // ── 404 + error handler ───────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
