import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';

/**
 * Verifies the access token in the Authorization header and attaches the
 * fresh user document to req.user. Throws 401 for any failure mode so the
 * mobile client can react uniformly (and trigger a refresh).
 */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Missing access token', 'NO_TOKEN');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      throw ApiError.unauthorized('Invalid or expired token', code);
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw ApiError.unauthorized('User no longer exists', 'USER_GONE');
    }

    req.user = user;
    req.tokenPayload = decoded;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Must run after requireAuth. Rejects anyone whose role isn't 'admin'.
 */
export function requireAdmin(req, _res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }
  if (req.user.role !== 'admin') {
    return next(ApiError.forbidden('Admin access required', 'ADMIN_ONLY'));
  }
  next();
}

/**
 * Optionally parses the Bearer token in the Authorization header.
 * Attaches req.user if token is valid, but does not throw errors.
 */
export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme === 'Bearer' && token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub);
      if (user) {
        req.user = user;
        req.tokenPayload = decoded;
      }
    }
  } catch (err) {
    // Ignore verification / find errors and proceed as guest
  }
  next();
}

