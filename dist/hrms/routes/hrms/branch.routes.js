"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const branchController_1 = require("../../controllers/hrms/branchController");
const auth_1 = require("../../middleware/auth");
const BranchRouter = (0, express_1.Router)();
BranchRouter.use(auth_1.authMiddleware); // JWT protect
BranchRouter.post("/", branchController_1.createBranch);
BranchRouter.get("/", branchController_1.getAllBranches);
BranchRouter.get("/:id", branchController_1.getBranchById);
BranchRouter.put("/:id", branchController_1.updateBranch);
BranchRouter.delete("/:id", branchController_1.deleteBranch);
exports.default = BranchRouter;
