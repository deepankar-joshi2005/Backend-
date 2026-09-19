"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.setRefreshCookie = setRefreshCookie;
exports.clearRefreshCookie = clearRefreshCookie;
exports.getRefreshCookie = getRefreshCookie;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/v1/auth";
function parseExpiryToMs(expiry) {
    const match = /^(\d+)([smhd])$/.exec(String(expiry).trim());
    if (!match)
        return 15 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return value * unitMs[unit];
}
function signAccessToken(user) {
    return jsonwebtoken_1.default.sign({
        sub: user._id.toString(),
        role: user.role,
        caFirmId: user.caFirmId ? user.caFirmId.toString() : null,
        tokenVersion: user.tokenVersion,
    }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" });
}
function signRefreshToken(user) {
    return jsonwebtoken_1.default.sign({ sub: user._id.toString(), tokenVersion: user.tokenVersion }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET);
}
function setRefreshCookie(res, token) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: "lax",
        path: REFRESH_COOKIE_PATH,
        maxAge: parseExpiryToMs(process.env.JWT_REFRESH_EXPIRES || "7d"),
    });
}
function clearRefreshCookie(res) {
    res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: "lax",
        path: REFRESH_COOKIE_PATH,
    });
}
function getRefreshCookie(req) {
    return req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : undefined;
}
