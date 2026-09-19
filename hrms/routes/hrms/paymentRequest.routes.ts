/** @format */

import { Router } from "express";
import {
  getAllPaymentRequests,
  updatePaymentStatus,
} from "../../controllers/hrms/paymentRequestController";

const PaymentRequestRouter = Router();

PaymentRequestRouter.get("/", getAllPaymentRequests);
PaymentRequestRouter.patch("/:type/:id/payment-status", updatePaymentStatus);

export default PaymentRequestRouter;
