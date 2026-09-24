import express from "express";
import rateLimit from "express-rate-limit";
import {
  getPublicBusinessClient,
  identifyEmployee,
  submitEmployeeForm,
} from "../controllers/publicEmployeeFormController";
import { validate } from "../middleware/validateRequest";
import { identifyEmployeeSchema, submitEmployeeFormSchema } from "../validators/publicEmployeeFormValidators";

// Unauthenticated by design — mounted before/outside `protect` in routes/index.ts.
// Every route here is scoped by the :token in the URL (BusinessClient.employeeFormToken),
// never by a logged-in session.
const router = express.Router();

// Stricter than authLimiter (CA-Management's own login) — an Employee ID is
// only partly secret (predictable format), so this is the only real barrier
// between a public link and someone else's employee data.
const identifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later" },
});

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later" },
});

router.get("/:token", getPublicBusinessClient);
router.post("/:token/identify", identifyLimiter, validate(identifyEmployeeSchema), identifyEmployee);
router.post("/:token/employees", submitLimiter, validate(submitEmployeeFormSchema), submitEmployeeForm);

export default router;
