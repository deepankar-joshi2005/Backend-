"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const escalationController_1 = require("../../controllers/hrms/escalationController");
const auth_1 = require("../../middleware/auth");
const escalationRouter = express_1.default.Router();
// Apply auth middleware to all routes
escalationRouter.use(auth_1.authMiddleware);
escalationRouter.post("/", escalationController_1.createEscalation);
escalationRouter.get("/", escalationController_1.getAllEscalations);
escalationRouter.get("/my", escalationController_1.getMyEscalations);
escalationRouter.patch("/:id", escalationController_1.updateEscalationStatus);
exports.default = escalationRouter;
