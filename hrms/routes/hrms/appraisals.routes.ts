/** @format */

import { Router } from "express";
import {
  createAppraisal,
  getAppraisals,
  getAppraisalById,
  updateAppraisal,
  deleteAppraisal,
} from "../../controllers/hrms/appraisalsController";
import { authMiddleware } from "../../middleware/auth";

const AppraisalsRouter = Router();

/* HR / ADMIN */
AppraisalsRouter.post("/", authMiddleware, createAppraisal);
AppraisalsRouter.get("/", authMiddleware, getAppraisals);
AppraisalsRouter.get("/:id", authMiddleware, getAppraisalById);
AppraisalsRouter.put("/:id", authMiddleware, updateAppraisal);
AppraisalsRouter.delete("/:id", authMiddleware, deleteAppraisal);

export default AppraisalsRouter;
