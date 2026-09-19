"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @format */
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const uploadHrPolicy_1 = require("../../utils/uploadHrPolicy");
const hrPolicyController_1 = require("../../controllers/hrms/hrPolicyController");
const hrPolicyRouter = (0, express_1.Router)();
hrPolicyRouter.use(auth_1.authMiddleware);
hrPolicyRouter.get("/", hrPolicyController_1.getHrPolicies);
hrPolicyRouter.post("/:policyId/upload", uploadHrPolicy_1.hrPolicyUpload.single("document"), hrPolicyController_1.uploadHrPolicyDocument);
hrPolicyRouter.delete("/:policyId/document", hrPolicyController_1.removeHrPolicyDocument);
exports.default = hrPolicyRouter;
