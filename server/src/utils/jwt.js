import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
    issuer: 'gym-master',
  });
}

export function signRefreshToken(payload) {
  // include a random jti so each refresh token is unique even for the
  // same user, which lets us individually revoke them.
  const jti = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign({ ...payload, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
    issuer: 'gym-master',
  });
  return { token, jti };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'gym-master' });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: 'gym-master' });
}

/**
 * Hashes a refresh token for storage. We never persist raw refresh
 * tokens — only the SHA-256 fingerprint. If the DB leaks, the tokens
 * remain unusable.
 */
export function fingerprint(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
