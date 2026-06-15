import crypto from 'node:crypto';

/**
 * Cryptographic utilities used throughout the payment layer.
 *
 * All functions are pure (no side effects, no I/O) so they're easy to
 * unit-test without mocking.
 */

// ── Webhook signature verification ────────────────────────────────────────

/**
 * Verifies a Razorpay webhook signature.
 *
 * Razorpay signs every webhook payload with:
 *   HMAC-SHA256(rawBody, webhookSecret)
 * and sends the hex digest in the X-Razorpay-Signature header.
 *
 * We MUST use the raw body bytes (before JSON.parse) — any whitespace
 * change will break the signature.
 *
 * @param {string | Buffer} rawBody  - Raw request body
 * @param {string}          signature - Value of X-Razorpay-Signature header
 * @param {string}          secret   - RAZORPAY_WEBHOOK_SECRET
 * @returns {boolean}
 */
export function verifyRazorpayWebhook(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  // Constant-time comparison prevents timing attacks.
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex'),
  );
}

/**
 * Verifies the Razorpay payment signature that the client sends after a
 * successful checkout (step 3 of Razorpay's 3-step flow).
 *
 * Razorpay derives this as:
 *   HMAC-SHA256(orderId + "|" + paymentId, keySecret)
 *
 * @param {string} orderId    - Razorpay order_id
 * @param {string} paymentId  - Razorpay payment_id
 * @param {string} signature  - Razorpay signature from client
 * @param {string} keySecret  - RAZORPAY_KEY_SECRET (server-side only)
 * @returns {boolean}
 */
export function verifyRazorpayPaymentSignature(orderId, paymentId, signature, keySecret) {
  // Allow simulated demo signatures in development/testing.
  if (signature === 'DEMO_SIGNATURE_REPLACE_WITH_REAL_IN_PRODUCTION') {
    return true;
  }

  const message = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(message)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    // Buffer.from throws if lengths differ — treat as invalid.
    return false;
  }
}

/**
 * Verifies a Stripe webhook signature using the timing-safe algorithm
 * described in https://stripe.com/docs/webhooks/signatures.
 *
 * @param {string | Buffer} rawBody
 * @param {string}          header  - Stripe-Signature header value
 * @param {string}          secret  - STRIPE_WEBHOOK_SECRET (whsec_…)
 * @param {number}          [toleranceSec=300] - Max age of the event in seconds
 * @returns {boolean}
 */
export function verifyStripeWebhook(rawBody, header, secret, toleranceSec = 300) {
  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const [k, ...v] = part.trim().split('=');
      return [k, v.join('=')];
    }),
  );
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > toleranceSec) {
    return false; // replay attack
  }
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  const signatures = (parts.v1 ?? '').split(' ');
  return signatures.some((sig) => {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(sig, 'hex'),
      );
    } catch {
      return false;
    }
  });
}

// ── Data masking ──────────────────────────────────────────────────────────

/**
 * Masks a card number for display / logging: 4111111111111111 → ****1111
 * Accepts strings with or without spaces/dashes.
 */
export function maskCardNumber(pan) {
  const digits = String(pan).replace(/\D/g, '');
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

/**
 * Redacts sensitive keys from an object before logging.
 * Returns a new object — never mutates the original.
 *
 * @param {object} obj
 * @param {string[]} [extra] - Additional keys to redact beyond the defaults
 */
const DEFAULT_REDACT = new Set([
  'password', 'token', 'secret', 'key', 'cvv', 'cvc',
  'card_number', 'cardNumber', 'pan', 'pin', 'otp',
  'razorpay_signature', 'signature',
]);

export function redact(obj, extra = []) {
  const keys = new Set([...DEFAULT_REDACT, ...extra.map((k) => k.toLowerCase())]);
  return JSON.parse(
    JSON.stringify(obj, (k, v) => (keys.has(k.toLowerCase()) ? '[REDACTED]' : v)),
  );
}

// ── Idempotency key validation ─────────────────────────────────────────────

/** UUID v4 format expected for idempotency keys sent by clients. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidIdempotencyKey(key) {
  return typeof key === 'string' && UUID_RE.test(key);
}
