/** @format */

import { Router } from "express";
import {
    createCostCenter,
    getCostCenters,
    getCostCenterById,
    updateCostCenter,
    deleteCostCenter,
} from "../../controllers/hrms/costCenterController";
import { authMiddleware } from "../../middleware/auth";

const CostCenterRouter = Router();

CostCenterRouter.use(authMiddleware);

CostCenterRouter.post("/", createCostCenter);
CostCenterRouter.get("/", getCostCenters);
CostCenterRouter.get("/:id", getCostCenterById);
CostCenterRouter.put("/:id", updateCostCenter);
CostCenterRouter.delete("/:id", deleteCostCenter);

export default CostCenterRouter;
