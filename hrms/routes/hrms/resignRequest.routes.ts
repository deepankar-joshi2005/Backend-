/** @format */

import { Router } from "express";
import {
  createResignation,
  getMyResignations,
  updateResignation,
  deleteResignation,
  updateResignationStatus,
  getAllResignations
} from "../../controllers/hrms/resignationRequestController";
import { authMiddleware } from "../../middleware/auth";

const ResingRequestRouter = Router();

/* EMPLOYEE */
ResingRequestRouter.get("/", authMiddleware, getMyResignations);
ResingRequestRouter.post("/", authMiddleware, createResignation);
ResingRequestRouter.patch("/:id", authMiddleware, updateResignation);
ResingRequestRouter.delete("/:id", authMiddleware, deleteResignation);
ResingRequestRouter.get("/all", authMiddleware, getAllResignations);
/* ADMIN / HR */
ResingRequestRouter.patch(
  "/status/:id",
  authMiddleware,
  updateResignationStatus
);

export default ResingRequestRouter;
