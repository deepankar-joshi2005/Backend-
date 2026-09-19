/** @format */

import { Router } from "express";
import {
  addCandidate,
  getAllCandidates,
  updateCandidate,
  updateCandidateStatus,
  deleteCandidate,
  getCandidatesForManager,
  updateInterviewFeedback,
} from "../../controllers/hrms/candidateController";
import { authMiddleware } from "../../middleware/auth";
import { uploadResume } from "../../utils/uploadResume";
const CandidateRouter = Router();

CandidateRouter.use(authMiddleware);
CandidateRouter.post("/", authMiddleware, uploadResume.single("resume"), addCandidate);
CandidateRouter.get("/", authMiddleware, getAllCandidates);
CandidateRouter.get("/manager/interviews", authMiddleware, getCandidatesForManager);
CandidateRouter.put(
  "/:id",
  authMiddleware,
  uploadResume.single("resume"),
  updateCandidate
);
CandidateRouter.patch("/:id/status", authMiddleware, updateCandidateStatus);
CandidateRouter.patch("/:id/feedback", authMiddleware, updateInterviewFeedback);
CandidateRouter.delete("/:id", authMiddleware, deleteCandidate);

export default CandidateRouter;
