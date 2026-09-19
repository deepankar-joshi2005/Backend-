"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisionCompanyForCa = provisionCompanyForCa;
exports.issueSsoTokenFor = issueSsoTokenFor;
exports.verifyHrmsCredentials = verifyHrmsCredentials;
// Plain, directly-callable versions of the CA-Management <-> HRMS bridge
// operations. Originally these were only reachable over HTTP (from when HRMS
// ran as a separate service); now that both are one process, CA-Backend's own
// controllers call these functions in-process instead of making a self-referential
// fetch() to their own server — which is both faster and avoids a real hang seen
// under load with self-connections on some environments.
const bcrypt_1 = __importDefault(require("bcrypt"));
const Company_1 = __importDefault(require("./models/hrms/Company"));
const User_1 = __importDefault(require("./models/User"));
const constants_1 = require("./constants");
const jwt_1 = require("./utils/jwt");
const documentTypeController_1 = require("./controllers/hrms/documentTypeController");
async function provisionCompanyForCa({ companyName, adminName, adminEmail, adminPasswordHash, adminPhone, caFirmId, caFirmName, employeeLimit, }) {
    if (!companyName || !adminName || !adminEmail || !adminPasswordHash || !caFirmId) {
        throw new Error("Required fields missing");
    }
    const existingUser = await User_1.default.findOne({ email: adminEmail });
    if (existingUser)
        throw new Error("Admin email already registered in HRMS");
    const now = new Date();
    const prefix = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastCompany = await Company_1.default.findOne({ companyId: new RegExp(`^${prefix}`) }).sort({ companyId: -1 });
    let runningNumber = 1;
    if (lastCompany === null || lastCompany === void 0 ? void 0 : lastCompany.companyId) {
        runningNumber = parseInt(lastCompany.companyId.slice(4)) + 1;
    }
    const companyId = prefix + String(runningNumber).padStart(4, "0");
    const company = new Company_1.default({
        companyId,
        name: companyName,
        email: adminEmail,
        phone: adminPhone || "",
        caFirmId,
        caFirmName,
        subscriptionPlan: "ACTIVE",
        subscriptionStatus: "PAID",
        subscriptionEndDate: new Date(now.getFullYear() + 10, now.getMonth(), now.getDate()),
        employeeLimit: employeeLimit || 0,
    });
    await company.save();
    const admin = new User_1.default({
        employeeId: `${companyId}-001`,
        name: adminName,
        email: adminEmail,
        password: adminPasswordHash,
        mobile: adminPhone || "0000000000",
        role: constants_1.ROLES.SuperAdmin,
        companyId: company._id,
        isVerified: true,
        status: "ACTIVE",
        gender: "Other",
        dob: new Date(),
        joiningDate: new Date(),
    });
    await admin.save();
    company.createdBy = admin._id;
    await company.save();
    await (0, documentTypeController_1.seedDefaultDocumentTypesForCompany)(company._id);
    return { hrmsCompanyId: company._id, hrmsCompanyCode: company.companyId };
}
async function issueSsoTokenFor(email) {
    if (!email)
        throw new Error("Email is required");
    const user = await User_1.default.findOne({ email });
    if (!user)
        throw new Error("No HRMS account for this email");
    if (user.status !== "ACTIVE")
        throw new Error("This HRMS account is not active");
    return (0, jwt_1.generateToken)({ id: user._id, role: user.role });
}
async function verifyHrmsCredentials(email, password) {
    if (!email || !password)
        return { valid: false };
    const user = await User_1.default.findOne({ email });
    if (!user || !user.password)
        return { valid: false };
    const match = await bcrypt_1.default.compare(password, user.password);
    if (!match)
        return { valid: false };
    if (user.status !== "ACTIVE")
        return { valid: false };
    const token = (0, jwt_1.generateToken)({ id: user._id, role: user.role });
    return { valid: true, token };
}
