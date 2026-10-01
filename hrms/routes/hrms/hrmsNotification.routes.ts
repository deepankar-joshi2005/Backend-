import { Router } from "express";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getMyPreferences,
  updateMyPreferences,
} from "../../controllers/hrms/hrmsNotificationController";

const router = Router();

router.get("/", listMyNotifications);
router.get("/preferences", getMyPreferences);
router.put("/preferences", updateMyPreferences);
router.put("/read-all", markAllNotificationsRead);
router.put("/:id/read", markNotificationRead);

export default router;
