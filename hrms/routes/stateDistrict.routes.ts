import express from "express";
import {
  getDistrictsByState,
  getStates,
} from "../controllers/stateDistrictController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getStates);
router.get("/:stateId/districts", getDistrictsByState);

export default router;


