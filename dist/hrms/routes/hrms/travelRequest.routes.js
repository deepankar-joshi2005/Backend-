"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @format */
const express_1 = require("express");
const travelRequestController_1 = require("../../controllers/hrms/travelRequestController");
const auth_1 = require("../../middleware/auth");
const uploadTravel_1 = require("../../utils/uploadTravel");
const TravelRequestRouter = (0, express_1.Router)();
/* EMPLOYEE */
TravelRequestRouter.post("/", auth_1.authMiddleware, travelRequestController_1.createTravelRequest);
TravelRequestRouter.get("/me", auth_1.authMiddleware, travelRequestController_1.getMyTravelRequests);
TravelRequestRouter.put("/:id/receipt", auth_1.authMiddleware, uploadTravel_1.travelUpload.single("receiptUrl"), travelRequestController_1.uploadTravelReceipt);
TravelRequestRouter.put("/:id", auth_1.authMiddleware, travelRequestController_1.updateTravelRequest);
TravelRequestRouter.delete("/:id", auth_1.authMiddleware, travelRequestController_1.deleteTravelRequest);
TravelRequestRouter.get("/manager", auth_1.authMiddleware, travelRequestController_1.getManagerTravelRequests);
TravelRequestRouter.patch("/manager/:id/status", auth_1.authMiddleware, travelRequestController_1.updateManagerTravelStatus);
/* HR / ADMIN */
TravelRequestRouter.get("/", auth_1.authMiddleware, travelRequestController_1.getAllTravelRequests);
TravelRequestRouter.patch("/:id/status", auth_1.authMiddleware, travelRequestController_1.updateTravelRequestStatus);
exports.default = TravelRequestRouter;
