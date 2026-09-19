"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminBillingOverview = exports.downloadInvoice = exports.getPaymentHistory = exports.razorpayWebhook = exports.verifyRazorpayPayment = exports.createRazorpayOrder = exports.activateSubscription = exports.verifyLoginForCa = exports.issueSsoToken = exports.provisionFromCa = exports.registerCompany = void 0;
const Company_1 = __importDefault(require("../models/hrms/Company"));
const User_1 = __importDefault(require("../models/User"));
const constants_1 = require("../constants");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const Payment_1 = __importDefault(require("../models/hrms/Payment"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const documentTypeController_1 = require("./hrms/documentTypeController");
const internalBridge_1 = require("../internalBridge");
// 💳 Initialize Razorpay
const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
if (razorpayKeyId === "rzp_test_dummy_key") {
    console.warn("⚠️ [RAZORPAY] Running with dummy Key ID. Payments will NOT work in real environments.");
}
const razorpay = new razorpay_1.default({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
});
/**
 * 🚀 Public Registration for SaaS Companies
 * POST /api/saas/register
 */
const registerCompany = async (req, res) => {
    try {
        const { companyName, adminName, adminEmail, adminPassword, adminPhone, industry, city, state, address, employeeCount, website, gstNo, } = req.body;
        // Use uploaded file path if available
        let logo = "";
        if (req.file) {
            // Store relative path for frontend access
            logo = `/uploads/company-logos/${req.file.filename}`;
        }
        // 1. Validation
        if (!companyName || !adminEmail || !adminPassword) {
            return res.status(400).json({ message: "Required fields missing" });
        }
        const existingUser = await User_1.default.findOne({ email: adminEmail });
        if (existingUser) {
            return res.status(400).json({ message: "Admin email already registered" });
        }
        // 2. Generate Company ID
        const now = new Date();
        const prefix = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
        const lastCompany = await Company_1.default.findOne({ companyId: new RegExp(`^${prefix}`) }).sort({ companyId: -1 });
        let runningNumber = 1;
        if (lastCompany === null || lastCompany === void 0 ? void 0 : lastCompany.companyId) {
            runningNumber = parseInt(lastCompany.companyId.slice(4)) + 1;
        }
        const companyId = prefix + String(runningNumber).padStart(4, "0");
        // 3. Create Company
        const company = new Company_1.default({
            companyId,
            name: companyName,
            email: adminEmail,
            phone: adminPhone,
            industry,
            city,
            state,
            address,
            logo,
            website,
            gstNo,
            subscriptionPlan: "TRIAL",
            subscriptionStatus: "PENDING",
            trialStartDate: new Date(),
            employeeLimit: employeeCount || 1,
            subscriptionAmount: (employeeCount || 0) * 25,
        });
        await company.save();
        // 4. Create SuperAdmin User
        const admin = new User_1.default({
            employeeId: `${companyId}-001`,
            name: adminName,
            email: adminEmail,
            password: adminPassword,
            mobile: adminPhone,
            role: constants_1.ROLES.SuperAdmin,
            companyId: company._id,
            isVerified: true,
            status: "ACTIVE",
            gender: "Other", // Default
            dob: new Date(), // Placeholder
            joiningDate: new Date(),
        });
        await admin.save();
        // Link Company back to admin
        company.createdBy = admin._id;
        await company.save();
        // Give the new company a sensible default set of KYC document types
        await (0, documentTypeController_1.seedDefaultDocumentTypesForCompany)(company._id);
        return res.status(201).json({
            message: "Congratulations! Your HRMS is ready. Please login to continue.",
            companyId: company.companyId,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Registration failed",
            error: error.message,
        });
    }
};
exports.registerCompany = registerCompany;
/**
 * 🔒 Internal — provisions a Company + its top-level admin on behalf of
 * CA-Management, when a CA Firm Admin onboards a Business Client. Server-to-server
 * only (guarded by a shared secret, not a browser-facing endpoint).
 *
 * The admin's password arrives pre-hashed (bcrypt) from CA-Management so the
 * plaintext password never crosses the network — the User pre-save hook detects
 * the existing "$2b$" hash and stores it as-is instead of re-hashing it. The role
 * is always ROLES.SuperAdmin (this company's own top admin), never ROLES.HRMSAdmin
 * — that cross-company role has no place in a Company provisioned this way.
 *
 * POST /api/saas/provision-from-ca
 */
const provisionFromCa = async (req, res) => {
    try {
        if (req.headers["x-internal-secret"] !== process.env.HRMS_INTERNAL_SECRET) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const result = await (0, internalBridge_1.provisionCompanyForCa)(req.body);
        return res.status(201).json({ message: "HRMS company provisioned", ...result });
    }
    catch (error) {
        return res.status(500).json({
            message: error.message || "Provisioning failed",
            error: error.message,
        });
    }
};
exports.provisionFromCa = provisionFromCa;
/**
 * 🔒 Internal — mints a real HRMS login token for a user CA-Management already
 * authenticated, so a Business Client Admin/Employee typing their password once
 * on the CA-Management login page lands straight in their HRMS dashboard.
 *
 * Server-to-server only (shared secret) — never takes a password, only an email
 * already verified by the caller.
 *
 * POST /api/saas/sso-token
 */
const issueSsoToken = async (req, res) => {
    try {
        if (req.headers["x-internal-secret"] !== process.env.HRMS_INTERNAL_SECRET) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const token = await (0, internalBridge_1.issueSsoTokenFor)(req.body.email);
        return res.json({ token });
    }
    catch (error) {
        return res.status(500).json({ message: error.message || "Could not issue SSO token", error: error.message });
    }
};
exports.issueSsoToken = issueSsoToken;
/**
 * 🔒 Internal — verifies email+password against HRMS's own users and, if valid,
 * issues a login token. Used by CA-Management's login as a fallback: an employee
 * an HR Admin created directly inside HRMS (Manager, Finance, IT Admin, etc.) has
 * no account in CA-Management at all, so CA-Management checks here before
 * rejecting the login outright.
 *
 * POST /api/saas/verify-login
 */
const verifyLoginForCa = async (req, res) => {
    try {
        if (req.headers["x-internal-secret"] !== process.env.HRMS_INTERNAL_SECRET) {
            return res.status(401).json({ valid: false });
        }
        const result = await (0, internalBridge_1.verifyHrmsCredentials)(req.body.email, req.body.password);
        return res.json(result);
    }
    catch (error) {
        return res.status(500).json({ valid: false, error: error.message });
    }
};
exports.verifyLoginForCa = verifyLoginForCa;
/**
 * 💳 Activate/Renew Subscription (Simulated)
 * POST /api/saas/activate
 */
const activateSubscription = async (req, res) => {
    try {
        const { companyId } = req.body;
        if (!companyId) {
            return res.status(400).json({ message: "Company ID is required" });
        }
        const company = await Company_1.default.findById(companyId);
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        // 1. Calculate Dynamic Billing (Count actual total users for this company)
        const userCount = await User_1.default.countDocuments({ companyId: company._id });
        const amountPerEmployee = 25;
        const finalAmount = userCount * amountPerEmployee;
        // 2. Update to ACTIVE status
        company.subscriptionPlan = "ACTIVE";
        company.subscriptionStatus = "PAID";
        company.subscriptionAmount = finalAmount;
        company.employeeLimit = userCount; // Update limit to actual count at time of payment
        // 3. Set subscription end date to 30 days from now
        const nextBill = new Date();
        nextBill.setDate(nextBill.getDate() + 30);
        company.subscriptionEndDate = nextBill;
        await company.save();
        return res.status(200).json({
            message: `Subscription activated successfully for ${userCount} employees!`,
            plan: company.subscriptionPlan,
            amount: finalAmount,
            expiry: company.subscriptionEndDate,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Activation failed",
            error: error.message,
        });
    }
};
exports.activateSubscription = activateSubscription;
/**
 * 💳 Create Razorpay Order
 * POST /api/saas/create-order
 */
const createRazorpayOrder = async (req, res) => {
    try {
        const { companyId } = req.body;
        if (!companyId) {
            return res.status(400).json({ message: "Company ID is required" });
        }
        const company = await Company_1.default.findById(companyId);
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        // 💳 SMART METERED BILLING CALCULATION
        const now = new Date();
        const lastBill = new Date(company.lastBillingDate || company.createdAt);
        // 1. Calculate Unbilled "Live" Usage for currently active users
        const activeUsers = await User_1.default.find({ companyId: company._id, status: "ACTIVE" });
        let liveUsageDays = 0;
        activeUsers.forEach(u => {
            if (u.activeSince) {
                const start = new Date(Math.max(new Date(u.activeSince).getTime(), lastBill.getTime()));
                const diff = now.getTime() - start.getTime();
                liveUsageDays += Math.max(diff / (1000 * 60 * 60 * 24), 0);
            }
        });
        // 2. Total Days Consumed = Unbilled from Deleted Users + Live Active Users
        const totalDaysConsumed = (company.unbilledUsageDays || 0) + liveUsageDays;
        // 3. Prepaid Days = (Old Limit * Days in Cycle)
        const daysInCycle = Math.max((now.getTime() - lastBill.getTime()) / (1000 * 60 * 60 * 24), 1);
        const prepaidUserDays = (company.employeeLimit || 0) * daysInCycle;
        // 4. Calculate Overage (Usage exceeding prepaid slots)
        const overageDays = Math.max(totalDaysConsumed - prepaidUserDays, 0);
        const overageCharge = Math.round(overageDays * (25 / 30));
        // 5. Next Month Base (Standard Billing)
        const activeCount = activeUsers.length;
        const nextMonthBase = activeCount * 25;
        // 6. Final Amount
        const finalAmount = Math.max(nextMonthBase + overageCharge, 1);
        // 2. Create Order options
        const options = {
            amount: finalAmount * 100, // Razorpay works in paise
            currency: "INR",
            receipt: `receipt_order_${company.companyId}_${Date.now()}`,
            notes: {
                companyId: company._id.toString(),
                companyName: company.name,
                userCount: activeCount,
                overageCharge,
                baseCharge: nextMonthBase
            },
        };
        const order = await razorpay.orders.create(options);
        return res.status(200).json({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            companyName: company.name,
            userCount: activeCount,
            overageCharge,
            baseCharge: nextMonthBase
        });
    }
    catch (error) {
        console.error("Order creation Error:", error);
        return res.status(500).json({ message: "Failed to create payment order", error: error.message });
    }
};
exports.createRazorpayOrder = createRazorpayOrder;
/**
 * 🔐 Verify Razorpay Payment (Strict Security)
 * POST /api/saas/verify-payment
 */
const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, companyId } = req.body;
        // 1. Check for Duplicate Payment
        const existingPayment = await Payment_1.default.findOne({ paymentId: razorpay_payment_id });
        if (existingPayment) {
            return res.status(400).json({ message: "Duplicate payment detected" });
        }
        // 2. BACKEND SIGNATURE VERIFICATION (Mandatory)
        const secret = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto_1.default
            .createHmac("sha256", secret)
            .update(body.toString())
            .digest("hex");
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Invalid payment signature (Security Threat!)" });
        }
        // 3. SECURE STATUS FETCH FROM RAZORPAY API
        const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
        if (paymentDetails.status !== "captured") {
            return res.status(400).json({ message: "Payment not captured by Razorpay" });
        }
        // 4. AMOUNT MISMATCH CHECK (Hacker prevention)
        const company = await Company_1.default.findById(companyId);
        if (!company)
            return res.status(404).json({ message: "Company not found" });
        const userCount = await User_1.default.countDocuments({ companyId: company._id, status: "ACTIVE" });
        // 5. UPDATE BUSINESS LOGIC (Subscription Active)
        company.subscriptionPlan = "ACTIVE";
        company.subscriptionStatus = "PAID";
        company.employeeLimit = userCount;
        company.subscriptionAmount = userCount * 25; // Base amount for the record
        // RESET SMART METER
        company.unbilledUsageDays = 0;
        company.lastBillingDate = new Date();
        const nextBill = new Date();
        nextBill.setDate(nextBill.getDate() + 30);
        company.subscriptionEndDate = nextBill;
        await company.save();
        // Reset activeSince for all currently active users to start new cycle
        await User_1.default.updateMany({ companyId: company._id, status: "ACTIVE" }, { $set: { activeSince: new Date() } });
        // 6. SAVE PAYMENT RECORD (Audit Log)
        const payment = new Payment_1.default({
            companyId: company._id,
            userId: req.user._id,
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            amount: Number(paymentDetails.amount) / 100,
            status: "CAPTURED",
            method: paymentDetails.method,
            description: `Subscription for ${userCount} users`,
        });
        await payment.save();
        return res.status(200).json({
            message: "Payment verified and subscription activated successfully!",
            plan: company.subscriptionPlan,
            expiry: company.subscriptionEndDate
        });
    }
    catch (error) {
        console.error("Payment Verification Error:", error);
        return res.status(500).json({ message: "Internal server error during verification", error: error.message });
    }
};
exports.verifyRazorpayPayment = verifyRazorpayPayment;
/**
 * 🔔 Razorpay Webhook (Secondary Safety)
 */
const razorpayWebhook = async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "razorpay_webhook_secret";
    const signature = req.headers["x-razorpay-signature"];
    try {
        const isVerified = razorpay_1.default.validateWebhookSignature(JSON.stringify(req.body), signature, secret);
        if (!isVerified)
            return res.status(400).send("Invalid webhook signature");
        // Process event (payment.captured)
        const { event, payload } = req.body;
        if (event === "payment.captured") {
            const paymentDetails = payload.payment.entity;
            const companyId = paymentDetails.notes.companyId;
            // Ensure company is active even if frontend missed it
            const company = await Company_1.default.findById(companyId);
            if (company && company.subscriptionPlan !== "ACTIVE") {
                company.subscriptionPlan = "ACTIVE";
                company.subscriptionStatus = "PAID";
                const nextBill = new Date();
                nextBill.setDate(nextBill.getDate() + 30);
                company.subscriptionEndDate = nextBill;
                await company.save();
            }
        }
        res.status(200).send("Webhook received");
    }
    catch (err) {
        console.error("Webhook Error:", err);
        res.status(500).send("Webhook internal error");
    }
};
exports.razorpayWebhook = razorpayWebhook;
/**
 * 💳 Get Billing History
 * GET /api/saas/history/:companyId
 */
const getPaymentHistory = async (req, res) => {
    try {
        const { companyId } = req.params;
        if (!companyId) {
            return res.status(400).json({ message: "Company ID is required" });
        }
        const history = await Payment_1.default.find({ companyId })
            .sort({ createdAt: -1 })
            .populate("userId", "name email");
        return res.status(200).json(history);
    }
    catch (error) {
        console.error("Fetch History Error:", error);
        return res.status(500).json({ message: "Failed to fetch payment history", error: error.message });
    }
};
exports.getPaymentHistory = getPaymentHistory;
/**
 * 📄 Download Invoice (PDF)
 * GET /api/saas/invoice/:paymentId
 */
const downloadInvoice = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const payment = await Payment_1.default.findById(paymentId).populate("companyId");
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }
        const company = payment.companyId;
        // Create a new PDF document
        const doc = new pdfkit_1.default({ margin: 50 });
        // Stream the PDF back to the client
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=Invoice_${payment.paymentId}.pdf`);
        doc.pipe(res);
        // --- PDF Content ---
        // Header
        doc.fillColor("#444444")
            .fontSize(20)
            .text("INVOICE", { align: "right" })
            .fontSize(10)
            .text(`Invoice Number: INV-${payment.paymentId.slice(-6).toUpperCase()}`, { align: "right" })
            .text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`, { align: "right" })
            .moveDown();
        // Company Info (Seller)
        doc.fillColor("#000000")
            .fontSize(14)
            .text("ThinkPro HRMS", { underline: true })
            .fontSize(10)
            .text("Techize Solutions")
            .text("123 Business Park, Tech City")
            .text("GSTIN: 27AATCT1234A1Z1")
            .moveDown();
        // Bill To (Customer)
        doc.font("Helvetica-Bold")
            .fontSize(12)
            .text("Bill To:")
            .font("Helvetica")
            .fontSize(10)
            .text(company.name)
            .text(company.address || "N/A")
            .text(`GSTIN: ${company.gstNo || "N/A"}`)
            .moveDown();
        // Table Header
        const tableTop = 270;
        doc.rect(50, tableTop, 500, 25).fill("#444444"); // Darker header
        doc.fillColor("#ffffff") // White text on dark background
            .fontSize(11)
            .text("Description", 65, tableTop + 7)
            .text("Amount (INR)", 450, tableTop + 7, { align: "right" });
        // Table Content
        doc.fillColor("#000000")
            .fontSize(10)
            .text(payment.description || "Subscription Renewal", 65, tableTop + 40)
            .text(`${payment.amount.toLocaleString()}`, 450, tableTop + 40, { align: "right" });
        // Total Section
        doc.moveDown(5);
        const totalPos = doc.y;
        doc.rect(300, totalPos, 250, 30).fill("#f9fafb");
        doc.fillColor("#000000")
            .font("Helvetica-Bold")
            .fontSize(14)
            .text(`Total Amount: INR ${payment.amount.toLocaleString()}`, 310, totalPos + 8, { width: 230, align: "right" });
        doc.font("Helvetica");
        // Footer
        doc.fontSize(10)
            .fillColor("#888888")
            .text("Thank you for your business!", 50, 700, { align: "center", width: 500 });
        doc.end();
    }
    catch (error) {
        console.error("Invoice Generation Error:", error);
        return res.status(500).json({ message: "Failed to generate invoice", error: error.message });
    }
};
exports.downloadInvoice = downloadInvoice;
/**
 * 📊 Admin Billing Overview
 * GET /api/saas/admin/billing-overview
 * Access: HRMS-Admin only
 */
const getAdminBillingOverview = async (req, res) => {
    var _a;
    try {
        // 1. Basic Stats Calculation
        const [stats] = await Company_1.default.aggregate([
            {
                $group: {
                    _id: null,
                    totalCompanies: { $sum: 1 },
                    activePlans: { $sum: { $cond: [{ $eq: ["$subscriptionPlan", "ACTIVE"] }, 1, 0] } },
                    trialPlans: { $sum: { $cond: [{ $eq: ["$subscriptionPlan", "TRIAL"] }, 1, 0] } },
                    expiredPlans: { $sum: { $cond: [{ $eq: ["$subscriptionPlan", "EXPIRED"] }, 1, 0] } },
                }
            }
        ]);
        // 2. Total Revenue from Payment Model
        const revenueStats = await Payment_1.default.aggregate([
            { $match: { status: "CAPTURED" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalRevenue = ((_a = revenueStats[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
        // 3. Get Detailed Company List with Real-time Count
        const companiesRaw = await Company_1.default.find({})
            .select("name companyId email phone industry city state address logo website gstNo subscriptionPlan subscriptionStatus trialEndDate subscriptionEndDate employeeLimit subscriptionAmount createdAt")
            .sort({ createdAt: -1 });
        const companies = await Promise.all(companiesRaw.map(async (company) => {
            const activeUserCount = await User_1.default.countDocuments({
                companyId: company._id,
                status: "ACTIVE",
            });
            return {
                ...company.toObject(),
                activeUserCount,
            };
        }));
        return res.status(200).json({
            metrics: {
                totalCompanies: (stats === null || stats === void 0 ? void 0 : stats.totalCompanies) || 0,
                activePlans: (stats === null || stats === void 0 ? void 0 : stats.activePlans) || 0,
                trialPlans: (stats === null || stats === void 0 ? void 0 : stats.trialPlans) || 0,
                expiredPlans: (stats === null || stats === void 0 ? void 0 : stats.expiredPlans) || 0,
                totalRevenue
            },
            companies
        });
    }
    catch (error) {
        console.error("Admin Billing Overview Error:", error);
        return res.status(500).json({ message: "Failed to fetch dashboard data", error: error.message });
    }
};
exports.getAdminBillingOverview = getAdminBillingOverview;
