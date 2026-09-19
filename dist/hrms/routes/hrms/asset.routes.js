"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assetInventoryController_1 = require("../../controllers/hrms/assetInventoryController");
const auth_1 = require("../../middleware/auth");
const AssestRouter = (0, express_1.Router)();
/* IT Admin Protected Routes */
AssestRouter.post("/", auth_1.authMiddleware, assetInventoryController_1.createAsset);
AssestRouter.get("/", auth_1.authMiddleware, assetInventoryController_1.getAssets);
AssestRouter.get("/:id", auth_1.authMiddleware, assetInventoryController_1.getAssetById);
AssestRouter.patch("/:id", auth_1.authMiddleware, assetInventoryController_1.updateAsset);
AssestRouter.delete("/:id", auth_1.authMiddleware, assetInventoryController_1.deleteAsset);
AssestRouter.patch("/:id/assign", auth_1.authMiddleware, assetInventoryController_1.assignAsset);
/* UNASSIGN */
AssestRouter.patch("/:id/unassign", auth_1.authMiddleware, assetInventoryController_1.unassignAsset);
exports.default = AssestRouter;
