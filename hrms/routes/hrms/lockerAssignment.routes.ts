/** @format */
import { Router } from "express";
import {
  allocateLocker,
  getAllAssignments,
  updateAssignment,
  vacateAssignment,
  deleteAssignment,
} from "../../controllers/hrms/lockerAssignmentController";
import { authMiddleware } from "../../middleware/auth";
const LockerAssignmentRouter = Router();

LockerAssignmentRouter.post("/", authMiddleware, allocateLocker);
LockerAssignmentRouter.get("/", authMiddleware, getAllAssignments);
LockerAssignmentRouter.put("/:id", authMiddleware, updateAssignment);
LockerAssignmentRouter.patch("/:id/vacate", authMiddleware, vacateAssignment);
LockerAssignmentRouter.delete("/:id", authMiddleware, deleteAssignment);

export default LockerAssignmentRouter;
