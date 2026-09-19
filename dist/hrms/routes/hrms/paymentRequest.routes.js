"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentRequestController_1 = require("../../controllers/hrms/paymentRequestController");
const PaymentRequestRouter = (0, express_1.Router)();
PaymentRequestRouter.get("/", paymentRequestController_1.getAllPaymentRequests);
PaymentRequestRouter.patch("/:type/:id/payment-status", paymentRequestController_1.updatePaymentStatus);
exports.default = PaymentRequestRouter;
