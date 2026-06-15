/**
 * requireSubscription middleware
 * ─────────────────────────────
 * Guards any route that requires an active paid membership.
 *
 * Must be placed AFTER requireAuth so req.user is already populated.
 *
 * Behaviour:
 *   • Admin users bypass the check (they always have access).
 *   • Clients with an active Subscription pass through.
 *   • Clients with no subscription → 403 SUBSCRIPTION_REQUIRED.
 *   • Clients whose subscription has expired → 402 SUBSCRIPTION_EXPIRED
 *     (HTTP 402 "Payment Required" is semantically correct here).
 *
 * We query the DB on every request so changes (cancellation, expiry) take
 * effect immediately rather than waiting for a token refresh cycle.
 * For high-traffic routes consider caching with a short TTL (Redis).
 */

import { Subscription } from '../models/Subscription.js';
import { AuditLog } from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export async function requireSubscription(req, _res, next) {
  try {
    // Admins always have full access.
    if (req.user?.role === 'admin') return next();

    const sub = await Subscription.findOne({
      user: req.user._id,
      status: 'active',
      endDate: { $gt: new Date() },
    }).select('_id plan billing endDate').lean();

    if (!sub) {
      // Distinguish "never subscribed" from "was subscribed but expired".
      const expired = await Subscription.findOne({
        user: req.user._id,
        status: { $in: ['expired', 'cancelled'] },
      }).select('_id').lean();

      if (expired) {
        // 402 Payment Required — subscription existed but is no longer active.
        await AuditLog.log({
          user: req.user._id,
          category: 'exercise',
          action: 'access.denied.expired',
          description: 'Expired subscription — exercise API access blocked',
          status: 'failure',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        }).catch(() => {}); // fire-and-forget; never block the response

        return next(
          new ApiError(
            402,
            'Your membership has expired. Please renew to continue accessing workouts.',
            'SUBSCRIPTION_EXPIRED',
          ),
        );
      }

      // Never had a subscription.
      logger.debug({ userId: req.user._id }, 'Exercise access blocked — no subscription');
      return next(
        ApiError.forbidden(
          'A gym membership is required to access this feature. Visit the Plans tab to subscribe.',
          'SUBSCRIPTION_REQUIRED',
        ),
      );
    }

    // Attach to request for downstream use (e.g. logging which plan).
    req.subscription = sub;
    next();
  } catch (err) {
    next(err);
  }
}
