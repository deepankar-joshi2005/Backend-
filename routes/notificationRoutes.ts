import express from "express";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  sendNotification,
} from "../controllers/notificationController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";
import { validate } from "../middleware/validateRequest";
import { sendNotificationSchema } from "../validators/notificationValidators";

const router = express.Router();

router.use(protect);

router.get("/", listMyNotifications);
router.put("/read-all", markAllNotificationsRead);
router.put("/:id/read", markNotificationRead);
router.post("/", authorize("super_admin"), validate(sendNotificationSchema), sendNotification);

export default router;
