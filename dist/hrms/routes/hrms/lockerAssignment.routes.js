"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @format */
const express_1 = require("express");
const lockerAssignmentController_1 = require("../../controllers/hrms/lockerAssignmentController");
const auth_1 = require("../../middleware/auth");
const LockerAssignmentRouter = (0, express_1.Router)();
LockerAssignmentRouter.post("/", auth_1.authMiddleware, lockerAssignmentController_1.allocateLocker);
LockerAssignmentRouter.get("/", auth_1.authMiddleware, lockerAssignmentController_1.getAllAssignments);
LockerAssignmentRouter.put("/:id", auth_1.authMiddleware, lockerAssignmentController_1.updateAssignment);
LockerAssignmentRouter.patch("/:id/vacate", auth_1.authMiddleware, lockerAssignmentController_1.vacateAssignment);
LockerAssignmentRouter.delete("/:id", auth_1.authMiddleware, lockerAssignmentController_1.deleteAssignment);
exports.default = LockerAssignmentRouter;
