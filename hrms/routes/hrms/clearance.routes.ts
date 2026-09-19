/** @format */

import { Router } from "express";
import {
  getAllClearances,
  updateDepartmentClearance,
  createClearanceFromResignation,
} from "../../controllers/hrms/cleranceController";

const ClearanceRouter = Router();

ClearanceRouter.get("/", getAllClearances);

ClearanceRouter.post("/from-resignation/:resignationId", createClearanceFromResignation);

ClearanceRouter.patch(
  "/:clearanceId/department",
  updateDepartmentClearance
);

export default ClearanceRouter;
