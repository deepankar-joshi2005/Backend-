import express from "express";
import {
  createTicket,
  listTickets,
  getTicket,
  replyToTicket,
  updateTicketStatus,
} from "../controllers/supportTicketController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";
import { validate } from "../middleware/validateRequest";
import {
  createTicketSchema,
  replyTicketSchema,
  updateTicketStatusSchema,
} from "../validators/supportTicketValidators";

const router = express.Router();

router.use(protect);

router.get("/", listTickets);
router.post("/", authorize("ca_firm_admin", "ca_firm_staff"), validate(createTicketSchema), createTicket);
router.get("/:id", getTicket);
router.post("/:id/reply", validate(replyTicketSchema), replyToTicket);
router.put("/:id/status", authorize("super_admin"), validate(updateTicketStatusSchema), updateTicketStatus);

export default router;
