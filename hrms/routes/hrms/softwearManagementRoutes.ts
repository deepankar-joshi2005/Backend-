/** @format */

import { Router } from "express";
import {
  assignSoftware,
  getAssignedSoftware,
  revokeSoftware,
} from "../../controllers/hrms/softwearManagementController";
import { authMiddleware } from "../../middleware/auth";

const SoftwearManagementRouter = Router();

/* IT Admin Protected Routes */
SoftwearManagementRouter.post("/assign", authMiddleware, assignSoftware);
SoftwearManagementRouter.get("/assigned", authMiddleware, getAssignedSoftware);
SoftwearManagementRouter.patch("/revoke/:id", authMiddleware, revokeSoftware);

export default SoftwearManagementRouter;