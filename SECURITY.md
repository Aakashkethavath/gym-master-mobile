# Security Architecture — Gym Master

This document describes the security controls implemented in the Gym Master platform, how to operate them, and the compliance posture relative to **PCI DSS**, **OWASP Top 10**, and general API security best practices.

---

## 1. Payment data — what we store vs what we don't

| Data | Stored by us? | Where |
|------|--------------|-------|
| Card number (PAN) | **Never** | Razorpay / Stripe handle PCI scope |
| Card CVV | **Never** | Not transmitted to our servers |
| Card expiry | **Never** | Stays within the gateway SDK |
| Payment amount | Yes | `Payment.amount` (in INR, not paise) |
| Razorpay payment_id | Yes | `Payment.gatewayRef` — reference only |
| Razorpay order_id | Yes | `RazorpayOrder.gatewayOrderId` |
| HMAC signature | Yes (at verification) | `RazorpayOrder.gatewaySignature` — post-verification only |
| Razorpay `key_id` | Yes | Env var — **publishable**, safe to expose |
| Razorpay `key_secret` | **Server-side only** | Docker secret, never in code or logs |
| Webhook secret | **Server-side only** | Docker secret |

By using Razorpay's hosted checkout and never collecting card details ourselves, **our servers are out of PCI DSS scope** for cardholder data (CHD). We remain in scope for PCI DSS SAQ A-EP (e-commerce redirect).

---

## 2. Payment flow security

```
Mobile App                  Our Server               Razorpay
──────────                  ──────────               ────────
1. POST /gateway/razorpay/order
   { planId, billing, idempotencyKey }
                     ──────────────────────────────>
                     createOrder(amount FROM DB)
                     verify plan is active
                     persist RazorpayOrder
                     <──────────────────────────────
                     { orderId, amountPaise, keyId }

2. Present Razorpay checkout (SDK)
   ─────────────────────────────────────────────────────────>
   Customer enters card details (never seen by our server)
   <─────────────────────────────────────────────────────────
   { payment_id, order_id, signature }

3. POST /gateway/razorpay/verify
   { razorpay_order_id, razorpay_payment_id, razorpay_signature }
                     ──────────────────────────────>
                     ① Verify HMAC-SHA256 signature   ← primary security check
                     ② Look up RazorpayOrder by orderId + userId
                     ③ Fetch payment from Razorpay API
                     ④ Compare captured amount to order amount
                     ⑤ Confirm status === 'captured'
                     ⑥ Create Subscription + Payment in a transaction
                     <──────────────────────────────
                     { subscription, payment }

4. Webhook (async, from Razorpay servers)
   ─────────────────────────────────────────────────────────>
                     Verify X-Razorpay-Signature header
                     Handle payment.captured / payment.failed
                     Idempotent: skip if already processed
```

**Why server-side amount verification matters**: A tampered client could send a `payment_id` for a ₹1 payment against a ₹1,799 plan. By fetching the payment from Razorpay's API at step ③ and comparing `payment.amount` with `order.amountPaise`, we catch this before creating any subscription.

---

## 3. Authentication security

| Control | Implementation |
|---------|---------------|
| Password hashing | bcrypt with cost factor 12 (OWASP recommended) |
| Access tokens | JWT, 15-minute TTL, HS256 |
| Refresh tokens | 30-day TTL, stored **hashed** (SHA-256) in MongoDB |
| Token rotation | Every refresh issues a new refresh token and invalidates the old one |
| Token revocation | Refresh tokens can be individually revoked (logout) or bulk-revoked (security event) |
| Brute-force protection | 10 req/15 min rate limit on `/auth/*` at both Nginx and Express layers |
| Secure storage | Tokens stored in `expo-secure-store` (iOS Keychain / Android Keystore) |

---

## 4. Subscription gate — exercise API

The exercise library is only accessible to users with an **active, non-expired subscription**:

```
GET /api/v1/exercises/*
  → requireAuth         (valid JWT)
  → requireSubscription (active Subscription in DB)
  → exerciseController  (proxy to ExerciseDB)
```

Response codes for non-subscribers:

| Code | HTTP | Meaning |
|------|------|---------|
| `SUBSCRIPTION_REQUIRED` | 403 | Never had a subscription |
| `SUBSCRIPTION_EXPIRED` | 402 | Had one, but it ended |

The mobile app surfaces a contextual upgrade wall for each case.

The **ExerciseDB RapidAPI key** is only present in the server environment — it is never sent to mobile clients. All exercise requests are proxied server-side.

---

## 5. Docker & infrastructure security

| Control | Detail |
|---------|--------|
| Non-root container | `USER gymmaster` (uid 1001) in Dockerfile |
| Read-only filesystem | `read_only: true` in production compose; only `/tmp` is writable |
| Dropped capabilities | `cap_drop: ALL` — containers have no Linux capabilities |
| No new privileges | `security_opt: no-new-privileges:true` |
| Internal network | MongoDB is on an `internal: true` bridge — unreachable from the host |
| Docker secrets | All sensitive values are files at `/run/secrets/` — never environment variables |
| TLS only | Nginx enforces HTTPS; HTTP traffic is redirected with 301 |
| TLS version | TLSv1.2 and TLSv1.3 only (PCI DSS 4.1) |
| HSTS | `max-age=31536000; includeSubDomains; preload` |
| Security headers | CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff |
| Image pinning | Base images use fixed minor versions (node:20-alpine, mongo:7) |

---

## 6. Audit logging

Every payment event, failed authentication, and subscription change is written to the `AuditLog` collection. Records are immutable (the model rejects `updateOne`/`updateMany`) and expire after `AUDIT_LOG_TTL_DAYS` days (default: 365).

**PCI DSS 10.x** requires audit logs covering:
- ✅ Individual user access to cardholder data systems
- ✅ All actions taken by anyone with root/admin privileges
- ✅ Access to all audit trails
- ✅ Invalid logical access attempts
- ✅ Use of and changes to identification and authentication mechanisms
- ✅ Initialization, stopping, or pausing of audit logs
- ✅ Creation and deletion of system-level objects

---

## 7. Rate limiting

| Endpoint | Limit | Layer |
|----------|-------|-------|
| `/auth/*` | 10 req/15 min/IP | Nginx + Express |
| `/gateway/*/order` `/gateway/*/verify` | 10 req/min/IP | Nginx + Express |
| `/api/*` (general) | 120 req/min/IP | Express |
| All requests | 30 req/s/IP | Nginx |

---

## 8. Secret rotation procedure

```bash
# Rotate a single secret (e.g. JWT access secret)
make rotate-secret NAME=jwt_access_secret

# For payment gateway secrets, enter the new value from the dashboard
make rotate-secret NAME=razorpay_key_secret
```

This backs up the old secret, writes the new value, and triggers a rolling restart of the API containers with zero downtime. Plan for a ~30 second window where some tokens signed with the old key will fail — clients will transparently refresh using the refresh token.

**Recommended rotation schedule**:
- JWT secrets: every 90 days
- Payment gateway secrets: on staff change or suspected compromise
- MongoDB password: every 180 days

---

## 9. Vulnerability disclosure

To report a security issue, email **security@gymmaster.app** with:
1. Description of the vulnerability
2. Steps to reproduce
3. Impact assessment

Please do not disclose vulnerabilities publicly until we have had 90 days to address them.
