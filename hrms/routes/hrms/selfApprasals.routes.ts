/** @format */

import { Router } from "express";
import {
  submitSelfAppraisal,
  getMySelfAppraisal,
  getEmployeeAppraisals,
} from "../../controllers/hrms/selfAppraisalsController";
import { authMiddleware } from "../../middleware/auth";

const SelfApprisalsRouter = Router();

SelfApprisalsRouter.get("/:appraisalId", authMiddleware, getMySelfAppraisal);
SelfApprisalsRouter.post("/", authMiddleware, submitSelfAppraisal);
SelfApprisalsRouter.get("/", authMiddleware, getEmployeeAppraisals);

export default SelfApprisalsRouter;
