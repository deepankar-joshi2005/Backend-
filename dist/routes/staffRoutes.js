"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const staffController_1 = require("../controllers/staffController");
const auth_1 = require("../middleware/auth");
const roleCheck_1 = require("../middleware/roleCheck");
const validateRequest_1 = require("../middleware/validateRequest");
const requireActiveFirm_1 = require("../middleware/requireActiveFirm");
const staffValidators_1 = require("../validators/staffValidators");
const router = express_1.default.Router();
router.use(auth_1.protect, (0, roleCheck_1.authorize)("ca_firm_admin"));
router.get("/", staffController_1.listStaff);
router.post("/", requireActiveFirm_1.requireActiveFirm, (0, validateRequest_1.validate)(staffValidators_1.createStaffSchema), staffController_1.createStaff);
router.put("/:id", requireActiveFirm_1.requireActiveFirm, (0, validateRequest_1.validate)(staffValidators_1.updateStaffSchema), staffController_1.updateStaff);
router.put("/:id/reset-password", requireActiveFirm_1.requireActiveFirm, (0, validateRequest_1.validate)(staffValidators_1.resetStaffPasswordSchema), staffController_1.resetStaffPassword);
exports.default = router;
