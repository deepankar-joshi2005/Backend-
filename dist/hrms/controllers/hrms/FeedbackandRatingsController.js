"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyAllAppraisalsWithFeedback = exports.getMyFeedback = exports.getPendingReviews = exports.submitManagerFeedback = void 0;
const FeedbackandRatings_1 = __importDefault(require("../../models/hrms/FeedbackandRatings"));
const SelfAppraisal_1 = __importDefault(require("../../models/hrms/SelfAppraisal"));
const submitManagerFeedback = async (req, res) => {
    try {
        const reviewerId = req.user.id;
        const { selfAppraisalId, managerRatings, feedback, recommendation } = req.body;
        const selfAppraisal = await SelfAppraisal_1.default.findById(selfAppraisalId);
        if (!selfAppraisal)
            return res.status(404).json({ message: "Self appraisal not found" });
        if (selfAppraisal.status !== "SUBMITTED")
            return res
                .status(400)
                .json({ message: "Self appraisal not submitted yet" });
        const already = await FeedbackandRatings_1.default.findOne({
            selfAppraisalId,
        });
        if (already)
            return res.status(400).json({ message: "Already reviewed" });
        const review = await FeedbackandRatings_1.default.create({
            selfAppraisalId,
            employeeId: selfAppraisal.employeeId,
            reviewerId,
            managerRatings,
            feedback,
            recommendation,
        });
        res.json(review);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to submit feedback" });
    }
};
exports.submitManagerFeedback = submitManagerFeedback;
const getPendingReviews = async (req, res) => {
    const managerId = req.user.id;
    const selfAppraisals = await SelfAppraisal_1.default.find({
        status: "SUBMITTED",
    })
        .populate({
        path: "employeeId",
        select: "name department managerId",
        match: { managerId },
    })
        .populate("appraisalId", "title type");
    const filtered = selfAppraisals.filter((s) => s.employeeId);
    const reviews = await FeedbackandRatings_1.default.find({
        selfAppraisalId: { $in: filtered.map((s) => s._id) },
    });
    const reviewedMap = new Map(reviews.map((r) => [r.selfAppraisalId.toString(), true]));
    const response = filtered.map((s) => ({
        selfAppraisalId: s._id,
        employee: s.employeeId,
        appraisal: s.appraisalId,
        // ✅ EMPLOYEE SELF DATA
        goalsAchievement: s.goalsAchievement,
        goalsRating: s.goalsRating,
        skillsRating: s.skillsRating,
        contributions: s.contributions,
        challenges: s.challenges,
        learning: s.learning,
        summary: s.summary,
        submittedAt: s.createdAt,
        status: reviewedMap.has(s._id.toString()) ? "REVIEWED" : "PENDING",
    }));
    res.json(response);
};
exports.getPendingReviews = getPendingReviews;
const getMyFeedback = async (req, res) => {
    const selfAppraisalId = req.params.selfAppraisalId;
    const feedback = await FeedbackandRatings_1.default.findOne({
        selfAppraisalId,
    })
        .populate("reviewerId", "name")
        .populate({
        path: "selfAppraisalId",
        populate: { path: "appraisalId", select: "title type" },
    });
    if (!feedback) {
        return res.status(404).json({ message: "Feedback not available yet" });
    }
    res.json(feedback);
};
exports.getMyFeedback = getMyFeedback;
const getMyAllAppraisalsWithFeedback = async (req, res) => {
    try {
        const employeeId = req.user.id;
        // 1️⃣ Employee ke saare self appraisals
        const selfAppraisals = await SelfAppraisal_1.default.find({
            employeeId,
        }).populate("appraisalId", "title type");
        if (!selfAppraisals.length) {
            return res.json([]);
        }
        // 2️⃣ Unke feedback (manager/HR)
        const feedbackDocs = await FeedbackandRatings_1.default.find({
            employeeId,
        }).populate("reviewerId", "name");
        // 3️⃣ Map for quick lookup (selfAppraisalId -> feedback)
        const feedbackMap = new Map(feedbackDocs.map((f) => [f.selfAppraisalId.toString(), f]));
        // 4️⃣ Final response
        const response = selfAppraisals.map((s) => {
            const feedbackDoc = feedbackMap.get(s._id.toString());
            const feedback = feedbackDoc
                ? feedbackDoc.toObject()
                : null;
            return {
                selfAppraisalId: s._id,
                appraisal: s.appraisalId,
                submittedAt: s.createdAt,
                status: feedback ? "REVIEWED" : "PENDING",
                // 🧑‍💼 EMPLOYEE SELF RATINGS
                selfRatings: {
                    goalsRating: s.goalsRating,
                    skillsRating: s.skillsRating,
                    summary: s.summary,
                },
                // 👨‍💼 MANAGER / HR FEEDBACK
                managerFeedback: feedback
                    ? {
                        reviewer: feedback.reviewerId,
                        managerRatings: feedback.managerRatings,
                        feedback: feedback.feedback,
                        recommendation: feedback.recommendation,
                        overallRating: feedback.managerRatings.overall,
                        reviewedAt: feedback.createdAt,
                    }
                    : null,
            };
        });
        res.json(response);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to load appraisal history" });
    }
};
exports.getMyAllAppraisalsWithFeedback = getMyAllAppraisalsWithFeedback;
