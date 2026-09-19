"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployeeAppraisals = exports.getMySelfAppraisal = exports.submitSelfAppraisal = void 0;
const SelfAppraisal_1 = __importDefault(require("../../models/hrms/SelfAppraisal"));
const Appraisal_1 = __importDefault(require("../../models/hrms/Appraisal"));
const submitSelfAppraisal = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const appraisal = await SelfAppraisal_1.default.findOneAndUpdate({
            appraisalId: req.body.appraisalId,
            employeeId,
        }, { ...req.body, status: "SUBMITTED" }, { upsert: true, new: true });
        res.json(appraisal);
    }
    catch (err) {
        res.status(500).json({ message: "Submission failed" });
    }
};
exports.submitSelfAppraisal = submitSelfAppraisal;
const getMySelfAppraisal = async (req, res) => {
    const employeeId = req.user.id;
    const appraisalId = req.params.appraisalId;
    const data = await SelfAppraisal_1.default.findOne({ appraisalId, employeeId });
    res.json(data);
};
exports.getMySelfAppraisal = getMySelfAppraisal;
const getEmployeeAppraisals = async (req, res) => {
    const employeeId = req.user.id;
    const departmentId = req.user.departmentId;
    const appraisals = await Appraisal_1.default.find({
        status: "ACTIVE",
        $or: [
            { department: "ALL" },
            { department: departmentId },
            { employees: employeeId },
        ],
    }).sort({ createdAt: -1 });
    const appraisalIds = appraisals.map((a) => a._id);
    const submissions = await SelfAppraisal_1.default.find({
        appraisalId: { $in: appraisalIds },
        employeeId,
    });
    const submissionMap = new Map(submissions.map((s) => [s.appraisalId.toString(), s]));
    const response = appraisals.map((a) => {
        const submission = submissionMap.get(a._id.toString());
        return {
            ...a.toObject(),
            isSubmitted: !!submission,
            submittedAt: (submission === null || submission === void 0 ? void 0 : submission.createdAt) || null,
            selfAppraisalId: (submission === null || submission === void 0 ? void 0 : submission._id) || null,
        };
    });
    res.json(response);
};
exports.getEmployeeAppraisals = getEmployeeAppraisals;
