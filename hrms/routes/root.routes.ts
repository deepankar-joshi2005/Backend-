import { Request, Response, Router } from "express";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import setupRouter from "./setup.routes";
import activityLogRouter from "./activityLogRoutes";
import stateDistrictRouter from "./stateDistrict.routes";
import RoleRouter from "./role.routes";
import saasRouter from "./saas.routes";
import { subscriptionMiddleware } from "../middleware/subscriptionMiddleware";
import { authMiddleware } from "../middleware/auth";

// HRMS Routes
import holidayRouter from "./hrms/holiday.routes";
import userDocumentRouter from "./hrms/userDocument.routes";
import letterRouter from "./hrms/latter.route";
import shiftRoutes from "./hrms/shifts.routes";
import SalaryStructureRouter from "./hrms/salaryStrctureRoute";
import PayslipRouter from "./hrms/payslip.routes";
import jobOpeningRouter from "./hrms/jobOpening.routes";
import CandidateRouter from "./hrms/candidate.routes";
import CompanyRouter from "./hrms/company.routes";
import BranchRouter from "./hrms/branch.routes";
import DepartmentRouter from "./hrms/department.routes";
import DesignationRouter from "./hrms/desigantion.routes";
import GoalRouter from "./hrms/goal.routes";
import AttendanceRouter from "./hrms/attendance.routes";
import AttendanceRequestRouter from "./hrms/attendanceRequest.routes";
import LeaveRouter from "./hrms/leave.routes";
import LeaveTypeRouter from "./hrms/leaveTypesRoutes";
import TravelRequestRouter from "./hrms/travelRequest.routes";
import ExpenseRouter from "./hrms/expense.routes";
import AppraisalsRouter from "./hrms/appraisals.routes";
import SelfApprisalsRouter from "./hrms/selfApprasals.routes";
import FeedbackRouter from "./hrms/feedbackAndRatings.routes";
import OnboardTaskRouter from "./hrms/onboardingTask.routes";
import PayrollRouter from "./hrms/payroll.routes";
import SoftwearManagementRouter from "./hrms/softwearManagementRoutes";
import AssestRouter from "./hrms/asset.routes";
import ResingRequestRouter from "./hrms/resignRequest.routes";
import ClearanceRouter from "./hrms/clearance.routes";
import WorkstationRouter from "./hrms/workstation.routes";
import AccessCardRouter from "./hrms/accessCard.routes";
import LockerAssignmentRouter from "./hrms/lockerAssignment.routes";
import ParkingRouter from "./hrms/parkingAssignment.routes";
import NonITAssetRouter from "./hrms/nonITAsset.routes";
import OvertimeRouter from "./hrms/overtime.routes";
import ProfileUpdateRouter from "./hrms/profileUpdate.routes";
import FinalSettlementRouter from "./hrms/finalSettlement.routes";
import CostCenterRouter from "./hrms/costCenter.routes";
import WorkingDayRouter from "./hrms/workingDay.routes";
import AttendancePolicyRouter from "./hrms/attendancePolicy.routes";
import MasterListRouter from "./hrms/masterList.routes";
import BulkEmployeeUploadRouter from "./hrms/employeeBulkUpload.routes";
import StatutoryReportRouter from "./hrms/statutoryReport.routes";
import LeaveEncashmentRouter from "./hrms/leaveEncashment.routes";
import escalationRouter from "./hrms/escalation.route";
import leaveBalanceAdjustmentRouter from "./hrms/leaveBalanceAdjustment.route";
import hrPolicyRouter from "./hrms/hrPolicy.routes";
import PaymentRequestRouter from "./hrms/paymentRequest.routes";
import DocumentTypeRouter from "./hrms/documentType.routes";
import DataManagementRouter from "./dataManagement.routes";

const rootRouter = Router();

rootRouter.get("/", (req: Request, res: Response) => {
  res.json({ message: "HRMS API - Active" });
});

// Auth & Setup
rootRouter.use("/auth", authRouter);
rootRouter.use("/setup", setupRouter);
rootRouter.use("/saas", saasRouter);

// Users
rootRouter.use("/users", authMiddleware, subscriptionMiddleware, userRouter);
rootRouter.use("/roles", authMiddleware, subscriptionMiddleware, RoleRouter);

// HRMS Module Endpoints
rootRouter.use("/documents", authMiddleware, subscriptionMiddleware, userDocumentRouter);
rootRouter.use("/document-types", authMiddleware, subscriptionMiddleware, DocumentTypeRouter);
rootRouter.use("/holidays", authMiddleware, subscriptionMiddleware, holidayRouter);
rootRouter.use("/letters", authMiddleware, subscriptionMiddleware, letterRouter);
rootRouter.use("/shifts", authMiddleware, subscriptionMiddleware, shiftRoutes);
rootRouter.use("/leave-types", authMiddleware, subscriptionMiddleware, LeaveTypeRouter);
rootRouter.use("/salary-structures", authMiddleware, subscriptionMiddleware, SalaryStructureRouter);
rootRouter.use("/payslips", authMiddleware, subscriptionMiddleware, PayslipRouter);
rootRouter.use("/job-openings", authMiddleware, subscriptionMiddleware, jobOpeningRouter);
rootRouter.use("/candidates", authMiddleware, subscriptionMiddleware, CandidateRouter);
rootRouter.use("/companies", authMiddleware, subscriptionMiddleware, CompanyRouter);
rootRouter.use("/branches", authMiddleware, subscriptionMiddleware, BranchRouter);
rootRouter.use("/departments", authMiddleware, subscriptionMiddleware, DepartmentRouter);
rootRouter.use("/designations", authMiddleware, subscriptionMiddleware, DesignationRouter);
rootRouter.use("/goals", authMiddleware, subscriptionMiddleware, GoalRouter);
rootRouter.use("/attendance", authMiddleware, subscriptionMiddleware, AttendanceRouter);
rootRouter.use("/attendance-request", authMiddleware, subscriptionMiddleware, AttendanceRequestRouter);
rootRouter.use("/employee/leaves", authMiddleware, subscriptionMiddleware, LeaveRouter);
rootRouter.use("/leave-encashment", authMiddleware, subscriptionMiddleware, LeaveEncashmentRouter);
rootRouter.use("/escalations", authMiddleware, subscriptionMiddleware, escalationRouter);
rootRouter.use("/leave-balance-adjustments", authMiddleware, subscriptionMiddleware, leaveBalanceAdjustmentRouter);
rootRouter.use("/hr-policies", authMiddleware, subscriptionMiddleware, hrPolicyRouter);
rootRouter.use("/travel-requests", authMiddleware, subscriptionMiddleware, TravelRequestRouter);
rootRouter.use("/expenses", authMiddleware, subscriptionMiddleware, ExpenseRouter);
rootRouter.use("/payment-requests", authMiddleware, subscriptionMiddleware, PaymentRequestRouter);
rootRouter.use("/appraisals", authMiddleware, subscriptionMiddleware, AppraisalsRouter);
rootRouter.use("/self-appraisals", authMiddleware, subscriptionMiddleware, SelfApprisalsRouter);
rootRouter.use("/feedback", authMiddleware, subscriptionMiddleware, FeedbackRouter);
rootRouter.use("/onboarding-tasks", authMiddleware, subscriptionMiddleware, OnboardTaskRouter);
rootRouter.use("/payroll", authMiddleware, subscriptionMiddleware, PayrollRouter);
rootRouter.use("/license", authMiddleware, subscriptionMiddleware, SoftwearManagementRouter);
rootRouter.use("/asset", authMiddleware, subscriptionMiddleware, AssestRouter);
rootRouter.use("/resignation", authMiddleware, subscriptionMiddleware, ResingRequestRouter);
rootRouter.use("/clearances", authMiddleware, subscriptionMiddleware, ClearanceRouter);
rootRouter.use("/final-settlement", authMiddleware, subscriptionMiddleware, FinalSettlementRouter);
rootRouter.use("/cost-centers", authMiddleware, subscriptionMiddleware, CostCenterRouter);
rootRouter.use("/working-days", authMiddleware, subscriptionMiddleware, WorkingDayRouter);
rootRouter.use("/attendance-policy", authMiddleware, subscriptionMiddleware, AttendancePolicyRouter);
rootRouter.use("/data-management", authMiddleware, subscriptionMiddleware, DataManagementRouter);
rootRouter.use("/master-lists", authMiddleware, subscriptionMiddleware, MasterListRouter);
rootRouter.use("/bulk-upload/employees", authMiddleware, subscriptionMiddleware, BulkEmployeeUploadRouter);
rootRouter.use("/workstations", authMiddleware, subscriptionMiddleware, WorkstationRouter);
rootRouter.use("/access-cards", authMiddleware, subscriptionMiddleware, AccessCardRouter);
rootRouter.use("/locker-assignments", authMiddleware, subscriptionMiddleware, LockerAssignmentRouter);
rootRouter.use("/parking-assignments", authMiddleware, subscriptionMiddleware, ParkingRouter);
rootRouter.use("/non-it-assets", authMiddleware, subscriptionMiddleware, NonITAssetRouter);
rootRouter.use("/overtime", authMiddleware, subscriptionMiddleware, OvertimeRouter);
rootRouter.use("/profile-update", authMiddleware, subscriptionMiddleware, ProfileUpdateRouter);

// States & Districts (Shared infrastructure)
rootRouter.use("/states", stateDistrictRouter);

// Activity Log Management (SuperAdmin only)
rootRouter.use("/activity-logs", authMiddleware, subscriptionMiddleware, activityLogRouter);

// Statutory Reports
rootRouter.use("/statutory-reports", authMiddleware, subscriptionMiddleware, StatutoryReportRouter);

export default rootRouter;


