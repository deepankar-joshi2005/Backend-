"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const nonITAssetController_1 = require("../../controllers/hrms/nonITAssetController");
const auth_1 = require("../../middleware/auth");
const NonITAssetRouter = (0, express_1.Router)();
/* CRUD ROUTES */
NonITAssetRouter.post("/", auth_1.authMiddleware, nonITAssetController_1.createAsset);
NonITAssetRouter.post("/:id/assign", auth_1.authMiddleware, nonITAssetController_1.assignNonITAsset);
NonITAssetRouter.get("/", auth_1.authMiddleware, nonITAssetController_1.getAllAssets);
NonITAssetRouter.get("/:id", auth_1.authMiddleware, nonITAssetController_1.getAssetById);
NonITAssetRouter.patch("/:id", auth_1.authMiddleware, nonITAssetController_1.updateAsset);
NonITAssetRouter.delete("/:id", auth_1.authMiddleware, nonITAssetController_1.deleteAsset);
NonITAssetRouter.patch("/:id/mark-damaged", auth_1.authMiddleware, nonITAssetController_1.markAssetDamaged);
NonITAssetRouter.patch("/:assetId/dispose", auth_1.authMiddleware, nonITAssetController_1.disposeAssetForEmployee);
exports.default = NonITAssetRouter;
