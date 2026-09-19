"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stateDistrictController_1 = require("../controllers/stateDistrictController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authMiddleware);
router.get("/", stateDistrictController_1.getStates);
router.get("/:stateId/districts", stateDistrictController_1.getDistrictsByState);
exports.default = router;
