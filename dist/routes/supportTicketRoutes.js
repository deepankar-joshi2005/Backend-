"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supportTicketController_1 = require("../controllers/supportTicketController");
const auth_1 = require("../middleware/auth");
const roleCheck_1 = require("../middleware/roleCheck");
const validateRequest_1 = require("../middleware/validateRequest");
const supportTicketValidators_1 = require("../validators/supportTicketValidators");
const router = express_1.default.Router();
router.use(auth_1.protect);
router.get("/", supportTicketController_1.listTickets);
router.post("/", (0, roleCheck_1.authorize)("ca_firm_admin", "ca_firm_staff"), (0, validateRequest_1.validate)(supportTicketValidators_1.createTicketSchema), supportTicketController_1.createTicket);
router.get("/:id", supportTicketController_1.getTicket);
router.post("/:id/reply", (0, validateRequest_1.validate)(supportTicketValidators_1.replyTicketSchema), supportTicketController_1.replyToTicket);
router.put("/:id/status", (0, roleCheck_1.authorize)("super_admin"), (0, validateRequest_1.validate)(supportTicketValidators_1.updateTicketStatusSchema), supportTicketController_1.updateTicketStatus);
exports.default = router;
