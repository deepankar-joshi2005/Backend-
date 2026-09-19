"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const masterListController_1 = require("../../controllers/hrms/masterListController");
const auth_1 = require("../../middleware/auth");
const MasterListRouter = (0, express_1.Router)();
MasterListRouter.use(auth_1.authMiddleware);
// Master items
MasterListRouter.post("/items", masterListController_1.createMasterItem);
MasterListRouter.get("/items", masterListController_1.getMasterItems);
MasterListRouter.put("/items/:id", masterListController_1.updateMasterItem);
MasterListRouter.delete("/items/:id", masterListController_1.deleteMasterItem);
// Tax slabs
MasterListRouter.post("/tax-slabs", masterListController_1.createTaxSlab);
MasterListRouter.get("/tax-slabs", masterListController_1.getTaxSlabs);
MasterListRouter.put("/tax-slabs/:id", masterListController_1.updateTaxSlab);
MasterListRouter.delete("/tax-slabs/:id", masterListController_1.deleteTaxSlab);
exports.default = MasterListRouter;
