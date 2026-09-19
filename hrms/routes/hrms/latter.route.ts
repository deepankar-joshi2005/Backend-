/** @format */

import { Router } from "express";
import {
  sendLetter,
  getAllLetters,
  getLettersByUser,
  toggleArchiveLetter,
} from "../../controllers/hrms/latterController";
import { authMiddleware } from "../../middleware/auth";
import { uploadLetter } from "../../utils/letterUpload"

const letterRouter = Router();

/**
 * 🔐 Protected HRMS Letter Routes
 */
letterRouter.use(authMiddleware);

/**
 * HR / Admin → Send Letter
 */
letterRouter.post("/", uploadLetter.single("file"), sendLetter);

/**
 * HR / Admin → Get All Letters
 */
letterRouter.get("/", getAllLetters);

/**
 * Employee / Admin → Get Letters by User
 */
letterRouter.get("/user/:userId", getLettersByUser);

/**
 * HR / Admin → Toggle Archive
 */
letterRouter.patch("/:id/toggle-archive", toggleArchiveLetter);

export default letterRouter;
