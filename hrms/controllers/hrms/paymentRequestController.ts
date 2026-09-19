/** @format */

import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { ROLES } from "../../constants";
import User from "../../models/User";
import Expense from "../../models/hrms/Expense";
import TravelRequest from "../../models/hrms/TravelRequest";
import LeaveEncashment from "../../models/hrms/LeaveEncashment";

const MODEL_BY_TYPE: Record<string, any> = {
  expense: Expense,
  travel: TravelRequest,
  encashment: LeaveEncashment,
};

const EMPLOYEE_POPULATE = {
  path: "employee",
  select: "name employeeId companyId departmentId",
  populate: { path: "departmentId", select: "name" },
};

/* 🔹 GET — unified list of APPROVED payment requests across Expense, Travel & Leave Encashment */
export const getAllPaymentRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, role } = req.user;
    const scoped = role !== ROLES.HRMSAdmin;
    const { type, paymentStatus, search } = req.query as {
      type?: string;
      paymentStatus?: string;
      search?: string;
    };

    // Expense & TravelRequest carry no companyId of their own — scope via the employee's company
    let employeeIds: any[] | undefined;
    if (scoped) {
      const companyUsers = await User.find({ companyId }, "_id").lean();
      employeeIds = companyUsers.map((u) => u._id);
    }
    const employeeFilter = employeeIds ? { employee: { $in: employeeIds } } : {};

    const [expenses, travels, encashments] = await Promise.all([
      type && type !== "Expense"
        ? Promise.resolve([])
        : Expense.find({ ...employeeFilter, status: "APPROVED" }).populate(EMPLOYEE_POPULATE).lean(),
      type && type !== "Travel"
        ? Promise.resolve([])
        : TravelRequest.find({ ...employeeFilter, status: "APPROVED" }).populate(EMPLOYEE_POPULATE).lean(),
      type && type !== "Leave Encashment"
        ? Promise.resolve([])
        : LeaveEncashment.find({ status: "APPROVED", ...(scoped ? { companyId } : {}) })
            .populate(EMPLOYEE_POPULATE)
            .lean(),
    ]);

    let unified = [
      ...expenses.map((e: any) => ({
        id: e._id.toString(),
        type: "Expense",
        employee: {
          _id: e.employee?._id?.toString(),
          name: e.employee?.name,
          employeeId: e.employee?.employeeId,
          departmentName: e.employee?.departmentId?.name,
        },
        category: e.subCategory ? `${e.expenseType} — ${e.subCategory}` : e.expenseType,
        amount: e.amount,
        date: e.date,
        status: e.status,
        paymentStatus: e.paymentStatus || "UNPAID",
      })),
      ...travels.map((t: any) => ({
        id: t._id.toString(),
        type: "Travel",
        employee: {
          _id: t.employee?._id?.toString(),
          name: t.employee?.name,
          employeeId: t.employee?.employeeId,
          departmentName: t.employee?.departmentId?.name,
        },
        category: `${t.purpose} — ${t.destination}`,
        amount: t.payable ?? t.budget,
        date: t.toDate,
        status: t.status,
        paymentStatus: t.paymentStatus || "UNPAID",
      })),
      ...encashments.map((l: any) => ({
        id: l._id.toString(),
        type: "Leave Encashment",
        employee: {
          _id: l.employee?._id?.toString(),
          name: l.employee?.name,
          employeeId: l.employee?.employeeId,
          departmentName: l.employee?.departmentId?.name,
        },
        category: `${l.leaveType} — ${l.requestedDays} day(s)`,
        amount: l.totalAmount,
        date: l.requestDate,
        status: l.status,
        paymentStatus: l.paymentStatus || "UNPAID",
      })),
    ];

    if (paymentStatus) {
      unified = unified.filter((u) => u.paymentStatus === paymentStatus);
    }
    if (search) {
      const q = search.toLowerCase();
      unified = unified.filter((u) => u.employee.name?.toLowerCase().includes(q));
    }

    unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ success: true, data: unified });
  } catch (error) {
    console.error("Payment Requests Fetch Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch payment requests" });
  }
};

/* 🔹 PATCH — Finance marks an approved request as Paid/Unpaid */
export const updatePaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { type, id } = req.params;
    const { paymentStatus } = req.body;

    if (!["UNPAID", "PAID"].includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: "Invalid payment status" });
    }

    if (req.user.role !== ROLES.Finance && req.user.role !== ROLES.HRMSAdmin) {
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
    if (req.user.role !== ROLES.HRMSAdmin) {
      const recordCompanyId =
        type === "encashment" ? record.companyId?.toString() : record.employee?.companyId?.toString();
      if (recordCompanyId !== req.user.companyId?.toString()) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }
    }

    record.paymentStatus = paymentStatus;
    await record.save();

    res.json({ success: true, message: "Payment status updated", data: record });
  } catch (error) {
    console.error("Payment Status Update Error:", error);
    res.status(500).json({ success: false, message: "Failed to update payment status" });
  }
};
