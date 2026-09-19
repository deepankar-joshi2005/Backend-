import express from "express";
import {
    createEscalation,
    getAllEscalations,
    updateEscalationStatus,
    getMyEscalations,
} from "../../controllers/hrms/escalationController";
import { authMiddleware } from "../../middleware/auth";

const escalationRouter = express.Router();

// Apply auth middleware to all routes
escalationRouter.use(authMiddleware);

escalationRouter.post("/", createEscalation);
escalationRouter.get("/", getAllEscalations);
escalationRouter.get("/my", getMyEscalations);
escalationRouter.patch("/:id", updateEscalationStatus);

export default escalationRouter;
