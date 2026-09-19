"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const leaveBalanceAdjustmentController_1 = require("../../controllers/hrms/leaveBalanceAdjustmentController");
const auth_1 = require("../../middleware/auth");
const leaveBalanceAdjustmentRouter = express_1.default.Router();
leaveBalanceAdjustmentRouter.use(auth_1.authMiddleware);
leaveBalanceAdjustmentRouter.get("/current", leaveBalanceAdjustmentController_1.getBalance);
leaveBalanceAdjustmentRouter.get("/my-balances", leaveBalanceAdjustmentController_1.getMyBalances);
leaveBalanceAdjustmentRouter.get("/history", leaveBalanceAdjustmentController_1.getAdjustmentHistory);
leaveBalanceAdjustmentRouter.post("/override", leaveBalanceAdjustmentController_1.overrideBalance);
exports.default = leaveBalanceAdjustmentRouter;
