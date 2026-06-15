/**
 * Audit log middleware
 * ────────────────────
 * Attaches a lightweight audit helper to every request so controllers can
 * write structured audit entries without boilerplate.
 *
 * Usage in controllers:
 *   await req.audit('payment', 'order.created', 'Order created', 'success', { orderId });
 */
import { AuditLog } from '../models/AuditLog.js';

export function attachAudit(req, _res, next) {
  req.audit = (category, action, description, status, meta = {}) =>
    AuditLog.log({
      user: req.user?._id ?? null,
      category,
      action,
      description,
      status,
      meta,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => {}); // Fire-and-forget — audit failures must NEVER break the request.

  next();
}
