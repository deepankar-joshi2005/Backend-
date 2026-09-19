"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const settingsController_1 = require("../controllers/settingsController");
const auth_1 = require("../middleware/auth");
const roleCheck_1 = require("../middleware/roleCheck");
const validateRequest_1 = require("../middleware/validateRequest");
const settingsValidators_1 = require("../validators/settingsValidators");
const router = express_1.default.Router();
router.use(auth_1.protect);
router.get("/", (0, roleCheck_1.authorize)("super_admin"), settingsController_1.getSettings);
router.put("/", (0, roleCheck_1.authorize)("super_admin"), (0, validateRequest_1.validate)(settingsValidators_1.updateSettingsSchema), settingsController_1.updateSettings);
exports.default = router;
