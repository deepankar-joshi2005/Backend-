/** @format */

import { Router } from "express";
import {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
} from "../controllers/hrms/roleController";
import { authMiddleware } from "../middleware/auth";

const RoleRouter = Router();

RoleRouter.post("/",authMiddleware, createRole);
RoleRouter.get("/",authMiddleware, getAllRoles);
RoleRouter.get("/:id",authMiddleware, getRoleById);
RoleRouter.put("/:id", authMiddleware, updateRole);
RoleRouter.delete("/:id", authMiddleware, deleteRole);

export default RoleRouter;
