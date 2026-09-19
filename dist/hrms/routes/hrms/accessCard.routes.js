"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const accessCardController_1 = require("../../controllers/hrms/accessCardController");
const auth_1 = require("../../middleware/auth");
const AccessCardRouter = (0, express_1.Router)();
/* ADMIN ONLY */
AccessCardRouter.post("/", auth_1.authMiddleware, accessCardController_1.issueCard);
AccessCardRouter.get("/", auth_1.authMiddleware, accessCardController_1.getAllCards);
AccessCardRouter.patch("/:id/status", auth_1.authMiddleware, accessCardController_1.updateCardStatus);
AccessCardRouter.put("/:id", auth_1.authMiddleware, accessCardController_1.updateCard);
exports.default = AccessCardRouter;
