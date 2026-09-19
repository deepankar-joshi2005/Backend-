"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const setupController_1 = require("../controllers/setupController");
const setupRouter = (0, express_1.Router)();
setupRouter.post("/complete-setup/:token", setupController_1.completeSetup);
setupRouter.get("/user/:token", setupController_1.getUserBySetupToken);
exports.default = setupRouter;
