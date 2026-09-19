"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const latterController_1 = require("../../controllers/hrms/latterController");
const auth_1 = require("../../middleware/auth");
const letterUpload_1 = require("../../utils/letterUpload");
const letterRouter = (0, express_1.Router)();
/**
 * 🔐 Protected HRMS Letter Routes
 */
letterRouter.use(auth_1.authMiddleware);
/**
 * HR / Admin → Send Letter
 */
letterRouter.post("/", letterUpload_1.uploadLetter.single("file"), latterController_1.sendLetter);
/**
 * HR / Admin → Get All Letters
 */
letterRouter.get("/", latterController_1.getAllLetters);
/**
 * Employee / Admin → Get Letters by User
 */
letterRouter.get("/user/:userId", latterController_1.getLettersByUser);
/**
 * HR / Admin → Toggle Archive
 */
letterRouter.patch("/:id/toggle-archive", latterController_1.toggleArchiveLetter);
exports.default = letterRouter;
