import jwt from "jsonwebtoken";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/v1/auth";

function parseExpiryToMs(expiry) {
  const match = /^(\d+)([smhd])$/.exec(String(expiry).trim());
  if (!match) return 15 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * unitMs[unit];
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      caFirmId: user.caFirmId ? user.caFirmId.toString() : null,
      tokenVersion: user.tokenVersion,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), tokenVersion: user.tokenVersion },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// "none" is required when frontend and backend are on different origins
// (e.g. Vercel + Render) — browsers silently drop a "lax" cookie on those
// cross-site requests, which breaks refresh without any visible error.
// "none" requires secure:true, which COOKIE_SECURE already guarantees in production.
const REFRESH_COOKIE_SAME_SITE = process.env.COOKIE_SECURE === "true" ? "none" : "lax";

export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: REFRESH_COOKIE_SAME_SITE,
    path: REFRESH_COOKIE_PATH,
    maxAge: parseExpiryToMs(process.env.JWT_REFRESH_EXPIRES || "7d"),
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: REFRESH_COOKIE_SAME_SITE,
    path: REFRESH_COOKIE_PATH,
  });
}

export function getRefreshCookie(req) {
  return req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : undefined;
}
