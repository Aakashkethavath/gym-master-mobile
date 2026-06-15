import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  fingerprint,
} from '../utils/jwt.js';
import { env } from '../config/env.js';

const REFRESH_TTL_MS = parseTtl(env.JWT_REFRESH_TTL);

function parseTtl(value) {
  // tiny "30d" / "15m" / "1h" parser — keeps a single source of truth
  // for refresh-token lifetime.
  const m = /^(\d+)([smhd])$/.exec(value);
  if (!m) return 30 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const mult = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]];
  return n * mult;
}

async function issueTokens(user, req) {
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const { token: refreshToken, jti } = signRefreshToken({ sub: user._id.toString() });

  user.refreshTokens.push({
    jti,
    tokenHash: fingerprint(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  // Prune expired/revoked tokens opportunistically.
  user.refreshTokens = user.refreshTokens.filter(
    (t) => !t.revokedAt && t.expiresAt > new Date(),
  );
  await user.save();

  return { accessToken, refreshToken };
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, contact, city } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('Email already registered', 'EMAIL_TAKEN');

  const user = await User.create({
    name,
    email,
    password,
    contact,
    city,
    role: 'client', // self-registration is always a client
  });

  // Re-fetch with the refreshTokens field selected so issueTokens can push to it.
  const withTokens = await User.findById(user._id).select('+refreshTokens');
  const tokens = await issueTokens(withTokens, req);

  res.status(201).json({ success: true, user, ...tokens });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // We need both the (hashed) password and refreshTokens, which are
  // select:false in the schema.
  const user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user) throw ApiError.unauthorized('Invalid credentials', 'BAD_CREDENTIALS');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials', 'BAD_CREDENTIALS');

  const tokens = await issueTokens(user, req);
  res.json({ success: true, user, ...tokens });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH');
  }

  const user = await User.findById(decoded.sub).select('+refreshTokens');
  if (!user) throw ApiError.unauthorized('User no longer exists', 'USER_GONE');

  const hash = fingerprint(refreshToken);
  const stored = user.refreshTokens.find(
    (t) => t.jti === decoded.jti && t.tokenHash === hash && !t.revokedAt,
  );
  if (!stored || stored.expiresAt < new Date()) {
    // Either reuse of a revoked token, or the token genuinely expired.
    // Best practice: revoke all sessions for safety.
    user.refreshTokens.forEach((t) => {
      if (!t.revokedAt) t.revokedAt = new Date();
    });
    await user.save();
    throw ApiError.unauthorized('Refresh token revoked', 'REFRESH_REVOKED');
  }

  // Rotate: invalidate the used refresh token and issue a fresh pair.
  stored.revokedAt = new Date();
  const tokens = await issueTokens(user, req);

  res.json({ success: true, ...tokens });
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.json({ success: true });
  }

  const user = await User.findById(req.user._id).select('+refreshTokens');
  if (user) {
    const hash = fingerprint(refreshToken);
    const stored = user.refreshTokens.find((t) => t.tokenHash === hash);
    if (stored) stored.revokedAt = new Date();
    await user.save();
  }

  res.json({ success: true });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});
