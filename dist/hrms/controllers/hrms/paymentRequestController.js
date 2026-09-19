"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePaymentStatus = exports.getAllPaymentRequests = void 0;
const constants_1 = require("../../constants");
const User_1 = __importDefault(require("../../models/User"));
const Expense_1 = __importDefault(require("../../models/hrms/Expense"));
const TravelRequest_1 = __importDefault(require("../../models/hrms/TravelRequest"));
const LeaveEncashment_1 = __importDefault(require("../../models/hrms/LeaveEncashment"));
const MODEL_BY_TYPE = {
    expense: Expense_1.default,
    travel: TravelRequest_1.default,
    encashment: LeaveEncashment_1.default,
};
const EMPLOYEE_POPULATE = {
    path: "employee",
    select: "name employeeId companyId departmentId",
    populate: { path: "departmentId", select: "name" },
};
/* 🔹 GET — unified list of APPROVED payment requests across Expense, Travel & Leave Encashment */
const getAllPaymentRequests = async (req, res) => {
    try {
        const { companyId, role } = req.user;
        const scoped = role !== constants_1.ROLES.HRMSAdmin;
        const { type, paymentStatus, search } = req.query;
        // Expense & TravelRequest carry no companyId of their own — scope via the employee's company
        let employeeIds;
        if (scoped) {
            const companyUsers = await User_1.default.find({ companyId }, "_id").lean();
            employeeIds = companyUsers.map((u) => u._id);
        }
        const employeeFilter = employeeIds ? { employee: { $in: employeeIds } } : {};
        const [expenses, travels, encashments] = await Promise.all([
            type && type !== "Expense"
                ? Promise.resolve([])
                : Expense_1.default.find({ ...employeeFilter, status: "APPROVED" }).populate(EMPLOYEE_POPULATE).lean(),
            type && type !== "Travel"
                ? Promise.resolve([])
                : TravelRequest_1.default.find({ ...employeeFilter, status: "APPROVED" }).populate(EMPLOYEE_POPULATE).lean(),
            type && type !== "Leave Encashment"
                ? Promise.resolve([])
                : LeaveEncashment_1.default.find({ status: "APPROVED", ...(scoped ? { companyId } : {}) })
                    .populate(EMPLOYEE_POPULATE)
                    .lean(),
        ]);
        let unified = [
            ...expenses.map((e) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    id: e._id.toString(),
                    type: "Expense",
                    employee: {
                        _id: (_b = (_a = e.employee) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString(),
                        name: (_c = e.employee) === null || _c === void 0 ? void 0 : _c.name,
                        employeeId: (_d = e.employee) === null || _d === void 0 ? void 0 : _d.employeeId,
                        departmentName: (_f = (_e = e.employee) === null || _e === void 0 ? void 0 : _e.departmentId) === null || _f === void 0 ? void 0 : _f.name,
                    },
                    category: e.subCategory ? `${e.expenseType} — ${e.subCategory}` : e.expenseType,
                    amount: e.amount,
                    date: e.date,
                    status: e.status,
                    paymentStatus: e.paymentStatus || "UNPAID",
                });
            }),
            ...travels.map((t) => {
                var _a, _b, _c, _d, _e, _f, _g;
                return ({
                    id: t._id.toString(),
                    type: "Travel",
                    employee: {
                        _id: (_b = (_a = t.employee) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString(),
                        name: (_c = t.employee) === null || _c === void 0 ? void 0 : _c.name,
                        employeeId: (_d = t.employee) === null || _d === void 0 ? void 0 : _d.employeeId,
                        departmentName: (_f = (_e = t.employee) === null || _e === void 0 ? void 0 : _e.departmentId) === null || _f === void 0 ? void 0 : _f.name,
                    },
                    category: `${t.purpose} — ${t.destination}`,
                    amount: (_g = t.payable) !== null && _g !== void 0 ? _g : t.budget,
                    date: t.toDate,
                    status: t.status,
                    paymentStatus: t.paymentStatus || "UNPAID",
                });
            }),
            ...encashments.map((l) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    id: l._id.toString(),
                    type: "Leave Encashment",
                    employee: {
                        _id: (_b = (_a = l.employee) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString(),
                        name: (_c = l.employee) === null || _c === void 0 ? void 0 : _c.name,
                        employeeId: (_d = l.employee) === null || _d === void 0 ? void 0 : _d.employeeId,
                        departmentName: (_f = (_e = l.employee) === null || _e === void 0 ? void 0 : _e.departmentId) === null || _f === void 0 ? void 0 : _f.name,
                    },
                    category: `${l.leaveType} — ${l.requestedDays} day(s)`,
                    amount: l.totalAmount,
                    date: l.requestDate,
                    status: l.status,
                    paymentStatus: l.paymentStatus || "UNPAID",
                });
            }),
        ];
        if (paymentStatus) {
            unified = unified.filter((u) => u.paymentStatus === paymentStatus);
        }
        if (search) {
            const q = search.toLowerCase();
            unified = unified.filter((u) => { var _a; return (_a = u.employee.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(q); });
        }
        unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.json({ success: true, data: unified });
    }
    catch (error) {
        console.error("Payment Requests Fetch Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch payment requests" });
    }
};
exports.getAllPaymentRequests = getAllPaymentRequests;
/* 🔹 PATCH — Finance marks an approved request as Paid/Unpaid */
const updatePaymentStatus = async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const { type, id } = req.params;
        const { paymentStatus } = req.body;
        if (!["UNPAID", "PAID"].includes(paymentStatus)) {
            return res.status(400).json({ success: false, message: "Invalid payment status" });
        }
        if (req.user.role !== constants_1.ROLES.Finance && req.user.role !== constants_1.ROLES.HRMSAdmin) {
            return res.status(403).json({ success: false, message: "Only Finance can update payment status" });
        }
        const Model = MODEL_BY_TYPE[type];
        if (!Model) {
            return res.status(400).json({ success: false, message: "Invalid request type" });
        }
        const record = await Model.findById(id).populate("employee", "companyId");
        if (!record) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }
        if (record.status !== "APPROVED") {
            return res.status(400).json({ success: false, message: "Only approved requests can be marked as paid" });
        }
        // Tenant isolation
        if (req.user.role !== constants_1.ROLES.HRMSAdmin) {
            const recordCompanyId = type === "encashment" ? (_a = record.companyId) === null || _a === void 0 ? void 0 : _a.toString() : (_c = (_b = record.employee) === null || _b === void 0 ? void 0 : _b.companyId) === null || _c === void 0 ? void 0 : _c.toString();
            if (recordCompanyId !== ((_d = req.user.companyId) === null || _d === void 0 ? void 0 : _d.toString())) {
                return res.status(403).json({ success: false, message: "Access denied." });
            }
        }
        record.paymentStatus = paymentStatus;
        await record.save();
        res.json({ success: true, message: "Payment status updated", data: record });
    }
    catch (error) {
        console.error("Payment Status Update Error:", error);
        res.status(500).json({ success: false, message: "Failed to update payment status" });
    }
};
exports.updatePaymentStatus = updatePaymentStatus;
