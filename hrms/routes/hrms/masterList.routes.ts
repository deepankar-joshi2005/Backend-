/** @format */

import { Router } from "express";
import {
    createMasterItem,
    getMasterItems,
    updateMasterItem,
    deleteMasterItem,
    createTaxSlab,
    getTaxSlabs,
    updateTaxSlab,
    deleteTaxSlab,
} from "../../controllers/hrms/masterListController";
import { authMiddleware } from "../../middleware/auth";

const MasterListRouter = Router();

MasterListRouter.use(authMiddleware);

// Master items
MasterListRouter.post("/items", createMasterItem);
MasterListRouter.get("/items", getMasterItems);
MasterListRouter.put("/items/:id", updateMasterItem);
MasterListRouter.delete("/items/:id", deleteMasterItem);

// Tax slabs
MasterListRouter.post("/tax-slabs", createTaxSlab);
MasterListRouter.get("/tax-slabs", getTaxSlabs);
MasterListRouter.put("/tax-slabs/:id", updateTaxSlab);
MasterListRouter.delete("/tax-slabs/:id", deleteTaxSlab);

export default MasterListRouter;
