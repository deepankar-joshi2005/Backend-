/** @format */

import { Router } from "express";
import {
  issueCard,
  getAllCards,
  updateCardStatus,
  updateCard,
} from "../../controllers/hrms/accessCardController";
import { authMiddleware } from "../../middleware/auth";

const AccessCardRouter = Router();

/* ADMIN ONLY */
AccessCardRouter.post("/", authMiddleware, issueCard);
AccessCardRouter.get("/", authMiddleware, getAllCards);
AccessCardRouter.patch("/:id/status", authMiddleware, updateCardStatus);
AccessCardRouter.put("/:id", authMiddleware, updateCard);

export default AccessCardRouter;
