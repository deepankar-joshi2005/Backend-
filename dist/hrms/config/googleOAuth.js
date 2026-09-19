"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const User_1 = __importDefault(require("../models/User"));
// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    }, async (accessToken, refreshToken, profile, done) => {
        var _a, _b;
        try {
            // Check if user already exists
            let user = await User_1.default.findOne({ email: (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value });
            if (user) {
                // If user exists, allow login
                return done(null, user);
            }
            // Guest registration is disabled. Only existing users can login via Google.
            return done(null, false, { message: "Account not found. Please contact administration." });
        }
        catch (error) {
            console.error("Google OAuth error:", error);
            return done(error, false);
        }
    }));
}
else {
    console.warn("Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
}
// Serialize user for session
passport_1.default.serializeUser((user, done) => {
    done(null, user._id);
});
// Deserialize user from session
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await User_1.default.findById(id);
        done(null, user);
    }
    catch (error) {
        done(error, false);
    }
});
exports.default = passport_1.default;
