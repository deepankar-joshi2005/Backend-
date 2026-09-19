/** @format */
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { hrPolicyUpload } from "../../utils/uploadHrPolicy";
import {
  getHrPolicies,
  uploadHrPolicyDocument,
  removeHrPolicyDocument,
} from "../../controllers/hrms/hrPolicyController";

const hrPolicyRouter = Router();
hrPolicyRouter.use(authMiddleware);

hrPolicyRouter.get("/", getHrPolicies);
hrPolicyRouter.post(
  "/:policyId/upload",
  hrPolicyUpload.single("document"),
  uploadHrPolicyDocument
);
hrPolicyRouter.delete("/:policyId/document", removeHrPolicyDocument);

export default hrPolicyRouter;
