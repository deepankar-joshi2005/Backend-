/** @format */

import { Router } from "express";
import {
  allocateDesk,
  getAllWorkstations,
  releaseDesk,
  updateWorkstationStatus,
} from "../../controllers/hrms/workstationController";
import { authMiddleware } from "../../middleware/auth";

const WorkstationRouter = Router();

/* 🔐 IT / Admin protected */
WorkstationRouter.post("/assign", authMiddleware, allocateDesk);
WorkstationRouter.get("/", authMiddleware, getAllWorkstations);
WorkstationRouter.patch("/release/:id", authMiddleware, releaseDesk);
WorkstationRouter.patch("/:id/status", updateWorkstationStatus);

export default WorkstationRouter;
