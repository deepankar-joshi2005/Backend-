/** @format */

import { Router } from "express";
import {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  markAssetDamaged,
  assignNonITAsset,
  disposeAssetForEmployee,
} from "../../controllers/hrms/nonITAssetController";
import { authMiddleware } from "../../middleware/auth";

const NonITAssetRouter = Router();

/* CRUD ROUTES */
NonITAssetRouter.post("/",authMiddleware, createAsset);
NonITAssetRouter.post("/:id/assign", authMiddleware, assignNonITAsset);
NonITAssetRouter.get("/",authMiddleware, getAllAssets);
NonITAssetRouter.get("/:id",authMiddleware, getAssetById);
NonITAssetRouter.patch("/:id",authMiddleware, updateAsset);
NonITAssetRouter.delete("/:id",authMiddleware, deleteAsset);
NonITAssetRouter.patch("/:id/mark-damaged",authMiddleware, markAssetDamaged);
NonITAssetRouter.patch("/:assetId/dispose",authMiddleware, disposeAssetForEmployee);

export default NonITAssetRouter;