import mongoose from 'mongoose';
import { env } from '../config/env.js';

/**
 * Immutable audit trail.
 *
 * Every payment lifecycle event, failed authentication attempt, webhook
 * receipt, and subscription change is written here.  Records are kept for
 * AUDIT_LOG_TTL_DAYS days then automatically expired by MongoDB's TTL
 * mechanism (configurable via env, default 365 days).
 *
 * PCI DSS 10.x requires audit logs to be retained for at least 12 months
 * and the most recent 3 months must be immediately available.
 *
 * Security: this collection is append-only.  The application user in
 * production should have INSERT but NOT UPDATE or DELETE on this collection.
 */
const auditLogSchema = new mongoose.Schema(
  {
    // Who did it (null = unauthenticated / gateway webhook)
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    // Stable event categories for programmatic querying
    category: {
      type: String,
      enum: ['payment', 'subscription', 'auth', 'webhook', 'exercise', 'admin', 'security'],
      required: true,
      index: true,
    },

    // Machine-readable event name within the category
    action: { type: String, required: true, index: true },

    // Human-readable summary (no PAN or secrets)
    description: { type: String, required: true },

    // Outcome
    status: { type: String, enum: ['success', 'failure', 'pending'], required: true },

    // Contextual metadata — sanitised, no card numbers
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Network context
    ip: { type: String },
    userAgent: { type: String },

    // TTL field — MongoDB expires documents when this date is reached
    expiresAt: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setDate(d.getDate() + (env.AUDIT_LOG_TTL_DAYS ?? 365));
        return d;
      },
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
    // Prevent accidental updates — audit logs must be immutable
    statics: {
      log(data) {
        return AuditLog.create(data);
      },
    },
  },
);

// Disallow all update operations at the model level.
['updateOne', 'updateMany', 'findByIdAndUpdate', 'findOneAndUpdate'].forEach((op) => {
  auditLogSchema.statics[op] = () => {
    throw new Error('AuditLog records are immutable');
  };
});

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
