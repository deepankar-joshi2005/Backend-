"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const finalSettlementController_1 = require("../../controllers/hrms/finalSettlementController");
const auth_1 = require("../../middleware/auth");
const FinalSettlementRouter = (0, express_1.Router)();
FinalSettlementRouter.get("/inactive-users", auth_1.authMiddleware, finalSettlementController_1.getInactiveUsersSettlements);
FinalSettlementRouter.post("/update-status", auth_1.authMiddleware, finalSettlementController_1.updateSettlementStatus);
exports.default = FinalSettlementRouter;
