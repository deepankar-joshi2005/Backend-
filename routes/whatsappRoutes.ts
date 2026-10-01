import express from "express";
import { verifyWebhook, receiveWebhook } from "../controllers/whatsappWebhookController";

// Public (Meta calls these) — authenticity is checked via the verify token on
// GET and the X-Hub-Signature-256 header on POST (see the controller).
const router = express.Router();

router.get("/webhook", verifyWebhook);
router.post("/webhook", receiveWebhook);

export default router;
