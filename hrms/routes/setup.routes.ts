import { Router } from "express";
import {
  completeSetup,
  getUserBySetupToken,
} from "../controllers/setupController";

const setupRouter = Router();

setupRouter.post("/complete-setup/:token", completeSetup);
setupRouter.get("/user/:token", getUserBySetupToken);

export default setupRouter;
