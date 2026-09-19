"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FeedbackandRatingsController_1 = require("../../controllers/hrms/FeedbackandRatingsController");
const auth_1 = require("../../middleware/auth");
const FeedbackRouter = (0, express_1.Router)();
/* MANAGER / HR */
FeedbackRouter.post("/", auth_1.authMiddleware, FeedbackandRatingsController_1.submitManagerFeedback);
FeedbackRouter.get("/pending", auth_1.authMiddleware, FeedbackandRatingsController_1.getPendingReviews);
/* EMPLOYEE */
FeedbackRouter.get("/my/:selfAppraisalId", auth_1.authMiddleware, FeedbackandRatingsController_1.getMyFeedback);
FeedbackRouter.get("/my", auth_1.authMiddleware, FeedbackandRatingsController_1.getMyAllAppraisalsWithFeedback);
exports.default = FeedbackRouter;
