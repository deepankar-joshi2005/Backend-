"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const salaryStructureController_1 = require("../../controllers/hrms/salaryStructureController");
const auth_1 = require("../../middleware/auth");
const SalaryStructureRouter = (0, express_1.Router)();
SalaryStructureRouter.use(auth_1.authMiddleware);
SalaryStructureRouter.post("/", salaryStructureController_1.addSalaryStructure);
SalaryStructureRouter.get("/", salaryStructureController_1.getAllSalaryStructures);
SalaryStructureRouter.get("/:id", salaryStructureController_1.getSalaryStructureById);
SalaryStructureRouter.put("/:id", salaryStructureController_1.updateSalaryStructure);
SalaryStructureRouter.delete("/:id", salaryStructureController_1.deleteSalaryStructureById);
exports.default = SalaryStructureRouter;
