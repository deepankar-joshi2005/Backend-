import express from "express";
import { listUsers, toggleUserActive } from "../controllers/userController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleCheck";

const router = express.Router();

router.use(protect, authorize("super_admin"));

router.get("/", listUsers);
router.put("/:id/toggle-active", toggleUserActive);

export default router;
