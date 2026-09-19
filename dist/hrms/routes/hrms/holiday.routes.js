"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const holidayController_1 = require("../../controllers/hrms/holidayController");
const auth_1 = require("../../middleware/auth");
const holidayRouter = (0, express_1.Router)();
/**
 * 🔐 Protected HRMS Holiday Routes
 */
holidayRouter.use(auth_1.authMiddleware);
holidayRouter.post("/", holidayController_1.addHoliday);
holidayRouter.get("/", holidayController_1.getAllHolidays);
holidayRouter.get("/:id", holidayController_1.getHolidayById);
holidayRouter.put("/:id", holidayController_1.updateHoliday);
holidayRouter.delete("/:id", holidayController_1.deleteHolidayById);
exports.default = holidayRouter;
