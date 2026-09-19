"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const costCenterController_1 = require("../../controllers/hrms/costCenterController");
const auth_1 = require("../../middleware/auth");
const CostCenterRouter = (0, express_1.Router)();
CostCenterRouter.use(auth_1.authMiddleware);
CostCenterRouter.post("/", costCenterController_1.createCostCenter);
CostCenterRouter.get("/", costCenterController_1.getCostCenters);
CostCenterRouter.get("/:id", costCenterController_1.getCostCenterById);
CostCenterRouter.put("/:id", costCenterController_1.updateCostCenter);
CostCenterRouter.delete("/:id", costCenterController_1.deleteCostCenter);
exports.default = CostCenterRouter;
