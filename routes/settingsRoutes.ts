import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";
import { validate } from "../middleware/validateRequest";
import { updateSettingsSchema } from "../validators/settingsValidators";

const router = express.Router();

router.use(protect);

router.get("/", authorize("super_admin"), getSettings);
router.put("/", authorize("super_admin"), validate(updateSettingsSchema), updateSettings);

export default router;
