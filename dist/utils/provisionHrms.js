"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisionHrmsCompany = provisionHrmsCompany;
exports.getHrmsSsoToken = getHrmsSsoToken;
exports.verifyHrmsLogin = verifyHrmsLogin;
// HRMS is merged into this same process now (see hrms/ folder) — these call
// its internal functions directly instead of making an HTTP request to
// itself, which is both faster and avoids a real hang seen with self-referential
// fetch() calls under load in some environments.
const internalBridge_1 = require("../hrms/internalBridge");
// Creates the matching Company + admin account in HRMS for a newly onboarded
// Business Client. The admin's password hash travels as-is (both sides use
// bcrypt-compatible hashing) so the plaintext password is never duplicated —
// the User pre-save hook detects the existing "$2b$" hash and stores it as-is.
async function provisionHrmsCompany({ companyName, adminName, adminEmail, adminPasswordHash, adminPhone, caFirmId, caFirmName, }) {
    return (0, internalBridge_1.provisionCompanyForCa)({ companyName, adminName, adminEmail, adminPasswordHash, adminPhone, caFirmId, caFirmName });
}
// Trades a verified email (the caller has already authenticated this user) for a
// real HRMS login token — lets a Business Client Admin/Employee who just logged
// into CA-Management land straight in their HRMS dashboard, no second login.
async function getHrmsSsoToken(email) {
    return (0, internalBridge_1.issueSsoTokenFor)(email);
}
// Fallback for CA-Management's own login: an email it doesn't recognize might
// belong to an employee an HR Admin created directly inside HRMS (Manager,
// Finance, IT Admin, ...) — those never get a CA-Management account of their
// own. Checks the credentials against HRMS itself before giving up entirely.
async function verifyHrmsLogin(email, password) {
    try {
        return await (0, internalBridge_1.verifyHrmsCredentials)(email, password);
    }
    catch {
        return { valid: false };
    }
}
