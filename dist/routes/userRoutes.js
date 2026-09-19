"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const roleCheck_1 = require("../middleware/roleCheck");
const router = express_1.default.Router();
router.use(auth_1.protect, (0, roleCheck_1.authorize)("super_admin"));
router.get("/", userController_1.listUsers);
router.put("/:id/toggle-active", userController_1.toggleUserActive);
exports.default = router;
