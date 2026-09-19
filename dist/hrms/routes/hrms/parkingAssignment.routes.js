"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const parkingAssignmentController_1 = require("../../controllers/hrms/parkingAssignmentController");
const auth_1 = require("../../middleware/auth");
const ParkingRouter = (0, express_1.Router)();
/* ADMIN / HR */
ParkingRouter.use(auth_1.authMiddleware);
ParkingRouter.post("/", parkingAssignmentController_1.createParkingAssignment);
ParkingRouter.get("/", parkingAssignmentController_1.getParkingAssignments);
ParkingRouter.get("/:id", parkingAssignmentController_1.getParkingAssignmentById);
ParkingRouter.patch("/:id", parkingAssignmentController_1.updateParkingAssignment);
ParkingRouter.delete("/:id", parkingAssignmentController_1.deleteParkingAssignment);
exports.default = ParkingRouter;
