"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const workstationController_1 = require("../../controllers/hrms/workstationController");
const auth_1 = require("../../middleware/auth");
const WorkstationRouter = (0, express_1.Router)();
/* 🔐 IT / Admin protected */
WorkstationRouter.post("/assign", auth_1.authMiddleware, workstationController_1.allocateDesk);
WorkstationRouter.get("/", auth_1.authMiddleware, workstationController_1.getAllWorkstations);
WorkstationRouter.patch("/release/:id", auth_1.authMiddleware, workstationController_1.releaseDesk);
WorkstationRouter.patch("/:id/status", workstationController_1.updateWorkstationStatus);
exports.default = WorkstationRouter;
