"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const candidateController_1 = require("../../controllers/hrms/candidateController");
const auth_1 = require("../../middleware/auth");
const uploadResume_1 = require("../../utils/uploadResume");
const CandidateRouter = (0, express_1.Router)();
CandidateRouter.use(auth_1.authMiddleware);
CandidateRouter.post("/", auth_1.authMiddleware, uploadResume_1.uploadResume.single("resume"), candidateController_1.addCandidate);
CandidateRouter.get("/", auth_1.authMiddleware, candidateController_1.getAllCandidates);
CandidateRouter.get("/manager/interviews", auth_1.authMiddleware, candidateController_1.getCandidatesForManager);
CandidateRouter.put("/:id", auth_1.authMiddleware, uploadResume_1.uploadResume.single("resume"), candidateController_1.updateCandidate);
CandidateRouter.patch("/:id/status", auth_1.authMiddleware, candidateController_1.updateCandidateStatus);
CandidateRouter.patch("/:id/feedback", auth_1.authMiddleware, candidateController_1.updateInterviewFeedback);
CandidateRouter.delete("/:id", auth_1.authMiddleware, candidateController_1.deleteCandidate);
exports.default = CandidateRouter;
