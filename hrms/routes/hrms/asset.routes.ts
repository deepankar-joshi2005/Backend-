/** @format */

import { Router } from "express";
import {
  createAsset,
  getAssets,
  getAssetById,
  deleteAsset,
  updateAsset,
  assignAsset,
  unassignAsset
} from "../../controllers/hrms/assetInventoryController";
import { authMiddleware } from "../../middleware/auth";

const AssestRouter = Router();

/* IT Admin Protected Routes */
AssestRouter.post("/", authMiddleware, createAsset);
AssestRouter.get("/", authMiddleware, getAssets);
AssestRouter.get("/:id", authMiddleware, getAssetById);
AssestRouter.patch("/:id", authMiddleware, updateAsset);
AssestRouter.delete("/:id", authMiddleware, deleteAsset);
AssestRouter.patch("/:id/assign", authMiddleware, assignAsset);

/* UNASSIGN */
AssestRouter.patch("/:id/unassign", authMiddleware, unassignAsset);

export default AssestRouter;