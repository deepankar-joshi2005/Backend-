/** @format */

import { Router } from "express";
import {
    getInactiveUsersSettlements,
    updateSettlementStatus,
} from "../../controllers/hrms/finalSettlementController";
import { authMiddleware } from "../../middleware/auth";

const FinalSettlementRouter = Router();

FinalSettlementRouter.get("/inactive-users", authMiddleware, getInactiveUsersSettlements);
FinalSettlementRouter.post("/update-status", authMiddleware, updateSettlementStatus);

export default FinalSettlementRouter;
