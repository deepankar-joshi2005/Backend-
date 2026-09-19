"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const shift_controller_1 = require("../../controllers/hrms/shift.controller");
const auth_1 = require("../../middleware/auth");
const ShiftRouter = express_1.default.Router();
/* WEEK VIEW */
ShiftRouter.get("/week", auth_1.authMiddleware, shift_controller_1.getShiftsByWeek);
/* SINGLE ASSIGN */
ShiftRouter.post("/", auth_1.authMiddleware, shift_controller_1.assignShift);
/* BULK ASSIGN */
ShiftRouter.post("/bulk", auth_1.authMiddleware, shift_controller_1.bulkAssignShift);
/* UPDATE SHIFT */
ShiftRouter.put("/:id", auth_1.authMiddleware, shift_controller_1.updateShift);
/* DELETE SHIFT */
ShiftRouter.delete("/:id", auth_1.authMiddleware, shift_controller_1.deleteShift);
exports.default = ShiftRouter;
