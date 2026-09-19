"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const designationController_1 = require("../../controllers/hrms/designationController");
const auth_1 = require("../../middleware/auth");
const DesignationRouter = (0, express_1.Router)();
DesignationRouter.use(auth_1.authMiddleware);
DesignationRouter.post("/", designationController_1.createDesignation);
DesignationRouter.get("/", designationController_1.getDesignations);
DesignationRouter.get("/:id", designationController_1.getDesignationById);
DesignationRouter.put("/:id", designationController_1.updateDesignation);
DesignationRouter.delete("/:id", designationController_1.deleteDesignation);
exports.default = DesignationRouter;
