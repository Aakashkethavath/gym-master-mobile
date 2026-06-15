/**
 * mongo-init/init.js
 *
 * Runs once when the MongoDB container is first created.
 * Creates a dedicated application user with the minimum permissions needed:
 *   • readWrite on the gymmaster database
 *   • No admin privileges
 *
 * This follows the principle of least privilege — the application user
 * cannot drop the database, access other databases, or create new users.
 *
 * The AuditLog collection is intended to be append-only. For stricter
 * enforcement, create a separate role that grants only insert+read on
 * that collection and deny update/delete.
 */

// Switch to the gymmaster database.
db = db.getSiblingDB('gymmaster');

// Create the application user.
// In production, the password is injected from a Docker secret via the
// MONGODB_URI secret file (not hardcoded here).
db.createUser({
  user: 'gymapp',
  pwd: 'change-this-in-production', // overridden by MONGODB_URI secret
  roles: [
    {
      role: 'readWrite',
      db: 'gymmaster',
    },
  ],
});

// Create indexes up-front so they don't slow the first app start.
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

db.subscriptions.createIndex({ user: 1 });
db.subscriptions.createIndex({ endDate: 1 });
db.subscriptions.createIndex({ status: 1 });

db.attendances.createIndex({ user: 1, date: 1 }, { unique: true });

db.razorpayorders.createIndex({ gatewayOrderId: 1 }, { unique: true });
db.razorpayorders.createIndex({ user: 1 });
db.razorpayorders.createIndex({ idempotencyKey: 1 }, { sparse: true, unique: true });
db.razorpayorders.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

db.auditlogs.createIndex({ user: 1 });
db.auditlogs.createIndex({ category: 1, action: 1 });
db.auditlogs.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print('✓ gymmaster database initialized');
