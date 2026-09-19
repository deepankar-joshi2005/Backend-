/** @format */
import { Router } from "express";
import {
  createTravelRequest,
  getMyTravelRequests,
  getAllTravelRequests,
  updateTravelRequest,
  deleteTravelRequest,
  updateTravelRequestStatus,
  getManagerTravelRequests,
  updateManagerTravelStatus,
  uploadTravelReceipt
} from "../../controllers/hrms/travelRequestController";
import { authMiddleware } from "../../middleware/auth";
import { travelUpload } from "../../utils/uploadTravel";

const TravelRequestRouter = Router();

/* EMPLOYEE */
TravelRequestRouter.post("/", authMiddleware, createTravelRequest);
TravelRequestRouter.get("/me", authMiddleware, getMyTravelRequests);
TravelRequestRouter.put(
  "/:id/receipt",
  authMiddleware,
  travelUpload.single("receiptUrl"),
  uploadTravelReceipt,
);
TravelRequestRouter.put("/:id", authMiddleware, updateTravelRequest);
TravelRequestRouter.delete("/:id", authMiddleware, deleteTravelRequest);
TravelRequestRouter.get("/manager", authMiddleware, getManagerTravelRequests);
TravelRequestRouter.patch("/manager/:id/status", authMiddleware, updateManagerTravelStatus);
/* HR / ADMIN */
TravelRequestRouter.get("/", authMiddleware, getAllTravelRequests);
TravelRequestRouter.patch("/:id/status", authMiddleware, updateTravelRequestStatus);

export default TravelRequestRouter;
