"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const departmentController_1 = require("../../controllers/hrms/departmentController");
const auth_1 = require("../../middleware/auth");
const DepartmentRouter = (0, express_1.Router)();
DepartmentRouter.use(auth_1.authMiddleware);
DepartmentRouter.post("/", departmentController_1.createDepartment);
DepartmentRouter.get("/", departmentController_1.getDepartments);
DepartmentRouter.get("/:id", departmentController_1.getDepartmentById);
DepartmentRouter.put("/:id", departmentController_1.updateDepartment);
DepartmentRouter.delete("/:id", departmentController_1.deleteDepartment);
exports.default = DepartmentRouter;
