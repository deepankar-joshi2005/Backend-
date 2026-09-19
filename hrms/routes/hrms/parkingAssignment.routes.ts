/** @format */

import { Router } from "express";
import {
  createParkingAssignment,
  getParkingAssignments,
  getParkingAssignmentById,
  updateParkingAssignment,
  deleteParkingAssignment,
} from "../../controllers/hrms/parkingAssignmentController";
import { authMiddleware } from "../../middleware/auth";

const ParkingRouter = Router();

/* ADMIN / HR */
ParkingRouter.use(authMiddleware);

ParkingRouter.post("/", createParkingAssignment);
ParkingRouter.get("/", getParkingAssignments);
ParkingRouter.get("/:id", getParkingAssignmentById);
ParkingRouter.patch("/:id", updateParkingAssignment);
ParkingRouter.delete("/:id", deleteParkingAssignment);

export default ParkingRouter;
