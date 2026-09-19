/** @format */

import { Router } from "express";
import { addHoliday,getAllHolidays,getHolidayById,updateHoliday,deleteHolidayById } from "../../controllers/hrms/holidayController";
import { authMiddleware } from "../../middleware/auth";

const holidayRouter = Router();

/**
 * 🔐 Protected HRMS Holiday Routes
 */
holidayRouter.use(authMiddleware);

holidayRouter.post("/", addHoliday);
holidayRouter.get("/", getAllHolidays);
holidayRouter.get("/:id", getHolidayById);
holidayRouter.put("/:id", updateHoliday);
holidayRouter.delete("/:id", deleteHolidayById);

export default holidayRouter;
