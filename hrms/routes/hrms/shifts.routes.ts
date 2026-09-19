/** @format */

import express from "express";
import {
  getShiftsByWeek,
  assignShift,
  bulkAssignShift,
  updateShift,
  deleteShift,
} from "../../controllers/hrms/shift.controller";
import { authMiddleware } from "../../middleware/auth";

const ShiftRouter = express.Router();

/* WEEK VIEW */
ShiftRouter.get("/week", authMiddleware, getShiftsByWeek);

/* SINGLE ASSIGN */
ShiftRouter.post("/", authMiddleware, assignShift);

/* BULK ASSIGN */
ShiftRouter.post("/bulk", authMiddleware, bulkAssignShift);

/* UPDATE SHIFT */
ShiftRouter.put("/:id", authMiddleware, updateShift);

/* DELETE SHIFT */
ShiftRouter.delete("/:id", authMiddleware, deleteShift);

export default ShiftRouter;
