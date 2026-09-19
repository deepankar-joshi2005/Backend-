"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notificationController_1 = require("../controllers/notificationController");
const auth_1 = require("../middleware/auth");
const roleCheck_1 = require("../middleware/roleCheck");
const validateRequest_1 = require("../middleware/validateRequest");
const notificationValidators_1 = require("../validators/notificationValidators");
const router = express_1.default.Router();
router.use(auth_1.protect);
router.get("/", notificationController_1.listMyNotifications);
router.put("/read-all", notificationController_1.markAllNotificationsRead);
router.put("/:id/read", notificationController_1.markNotificationRead);
router.post("/", (0, roleCheck_1.authorize)("super_admin"), (0, validateRequest_1.validate)(notificationValidators_1.sendNotificationSchema), notificationController_1.sendNotification);
exports.default = router;
