"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const loanCalculatorController_1 = require("../controllers/loanCalculatorController");
const auth_1 = require("../middleware/auth");
const roleCheck_1 = require("../middleware/roleCheck");
const validateRequest_1 = require("../middleware/validateRequest");
const requireActiveFirm_1 = require("../middleware/requireActiveFirm");
const loanCalculatorValidators_1 = require("../validators/loanCalculatorValidators");
const router = express_1.default.Router();
router.use(auth_1.protect, (0, roleCheck_1.authorize)("ca_firm_admin", "ca_firm_staff"));
router.get("/calculations", loanCalculatorController_1.listCalculations);
router.post("/calculations", requireActiveFirm_1.requireActiveFirm, (0, validateRequest_1.validate)(loanCalculatorValidators_1.createCalculationSchema), loanCalculatorController_1.createCalculation);
router.delete("/calculations/:id", requireActiveFirm_1.requireActiveFirm, loanCalculatorController_1.deleteCalculation);
exports.default = router;
