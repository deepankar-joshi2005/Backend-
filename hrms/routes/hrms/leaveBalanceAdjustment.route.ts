import express from "express";
import {
    getBalance,
    overrideBalance,
    getAdjustmentHistory,
    getMyBalances,
} from "../../controllers/hrms/leaveBalanceAdjustmentController";
import { authMiddleware } from "../../middleware/auth";

const leaveBalanceAdjustmentRouter = express.Router();

leaveBalanceAdjustmentRouter.use(authMiddleware);

leaveBalanceAdjustmentRouter.get("/current", getBalance);
leaveBalanceAdjustmentRouter.get("/my-balances", getMyBalances);
leaveBalanceAdjustmentRouter.get("/history", getAdjustmentHistory);
leaveBalanceAdjustmentRouter.post("/override", overrideBalance);

export default leaveBalanceAdjustmentRouter;
