"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roleController_1 = require("../controllers/hrms/roleController");
const auth_1 = require("../middleware/auth");
const RoleRouter = (0, express_1.Router)();
RoleRouter.post("/", auth_1.authMiddleware, roleController_1.createRole);
RoleRouter.get("/", auth_1.authMiddleware, roleController_1.getAllRoles);
RoleRouter.get("/:id", auth_1.authMiddleware, roleController_1.getRoleById);
RoleRouter.put("/:id", auth_1.authMiddleware, roleController_1.updateRole);
RoleRouter.delete("/:id", auth_1.authMiddleware, roleController_1.deleteRole);
exports.default = RoleRouter;
