"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resignationRequestController_1 = require("../../controllers/hrms/resignationRequestController");
const auth_1 = require("../../middleware/auth");
const ResingRequestRouter = (0, express_1.Router)();
/* EMPLOYEE */
ResingRequestRouter.get("/", auth_1.authMiddleware, resignationRequestController_1.getMyResignations);
ResingRequestRouter.post("/", auth_1.authMiddleware, resignationRequestController_1.createResignation);
ResingRequestRouter.patch("/:id", auth_1.authMiddleware, resignationRequestController_1.updateResignation);
ResingRequestRouter.delete("/:id", auth_1.authMiddleware, resignationRequestController_1.deleteResignation);
ResingRequestRouter.get("/all", auth_1.authMiddleware, resignationRequestController_1.getAllResignations);
/* ADMIN / HR */
ResingRequestRouter.patch("/status/:id", auth_1.authMiddleware, resignationRequestController_1.updateResignationStatus);
exports.default = ResingRequestRouter;
