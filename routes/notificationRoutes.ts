import express from "express";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  sendNotification,
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
  getWhatsAppUsage,
} from "../controllers/notificationController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";
import { validate } from "../middleware/validateRequest";
import { sendNotificationSchema, updatePreferencesSchema } from "../validators/notificationValidators";

const router = express.Router();

router.use(protect);

router.get("/", listMyNotifications);
router.get("/preferences", getMyNotificationPreferences);
router.put("/preferences", validate(updatePreferencesSchema), updateMyNotificationPreferences);
router.get("/whatsapp-usage", authorize("super_admin", "ca_firm_admin"), getWhatsAppUsage);
router.put("/read-all", markAllNotificationsRead);
router.put("/:id/read", markNotificationRead);
router.post("/", authorize("super_admin"), validate(sendNotificationSchema), sendNotification);

export default router;
