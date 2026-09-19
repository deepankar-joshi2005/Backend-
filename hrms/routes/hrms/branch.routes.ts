/** @format */

import { Router } from "express";
import {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
} from "../../controllers/hrms/branchController"
import { authMiddleware } from "../../middleware/auth";

const BranchRouter = Router();

BranchRouter.use(authMiddleware); // JWT protect

BranchRouter.post("/", createBranch);
BranchRouter.get("/", getAllBranches);
BranchRouter.get("/:id", getBranchById);
BranchRouter.put("/:id", updateBranch);
BranchRouter.delete("/:id", deleteBranch);

export default BranchRouter;
