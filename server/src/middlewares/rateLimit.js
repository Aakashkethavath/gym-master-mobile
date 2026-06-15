import rateLimit from 'express-rate-limit';

/**
 * Tight rate limit for authentication endpoints to throttle brute-force
 * login attempts and credential-stuffing attacks. 10 requests per 15 min
 * per IP is generous for real users and painful for attackers.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts, try again in a few minutes',
    code: 'RATE_LIMITED',
  },
});

/**
 * Looser limit for the public-facing API surface.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests',
    code: 'RATE_LIMITED',
  },
});
