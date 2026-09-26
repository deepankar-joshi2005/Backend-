/** @format */

import { Response } from "express";
import Letter from "../../models/hrms/Letter";
import { AuthRequest } from "../../middleware/auth";
import User from "../../models/User";
import { sendLetterEmail } from "../../utils/email";
/* ======================================================
   SEND LETTER (HR / ADMIN)
   ====================================================== */
export const sendLetter = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, letterType, message } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Letter file is required" });
    }

    if (!req.user.companyId) {
      return res.status(400).json({
        message: "Your account is not linked to a company, so you cannot send letters.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.companyId?.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({
        message: "You can only send letters to employees of your own company.",
      });
    }

    const letter = await Letter.create({
      user: userId,
      companyId: req.user.companyId,
      letterType,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: `uploads/letters/${req.file.filename}`,
      message,
      sentBy: req.user.id,
    });

    // 🔥 SEND EMAIL WITH PDF
    await sendLetterEmail({
      to: user.email,
      name: user.name,
      letterType,
      message,
      filePath: letter.filePath,
      originalName: letter.originalName,
    });

    res.status(201).json({
      message: "Letter sent successfully & email delivered",
      letter,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to send letter",
    });
  }
};

/* ======================================================
   GET LETTERS BY USER (Employee)
   ====================================================== */
export const getLettersByUser = async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = (req.user.id || req.user._id)?.toString();
    const elevatedRoles = ["hr-admin", "admin", "superadmin", "hrms-admin"];
    const isElevated = elevatedRoles.includes((req.user.role || "").toLowerCase());

    if (!isElevated && req.params.userId !== requesterId) {
      return res.status(403).json({
        message: "You can only view your own letters.",
      });
    }

    const letters = await Letter.find({
      user: req.params.userId,
    })
      .populate("sentBy", "name role")
      .sort({ createdAt: -1 });

    res.json(letters);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch letters",
    });
  }
};

/* ======================================================
   GET ALL LETTERS (HR / ADMIN)
   ====================================================== */
export const getAllLetters = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, letterType, startDate, endDate, search } = req.query;
    const filter: any = {
      // Scope to the requester's own company; requesters with no company see nothing.
      companyId: req.user.companyId || null,
    };

    if (userId) filter.user = userId;
    if (letterType) filter.letterType = letterType;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    let query = Letter.find(filter)
      .populate({
        path: "user",
        select: "name role email employeeId",
      })
      .populate("sentBy", "name role")
      .sort({ createdAt: -1 });

    let letters = await query;

    // 🔍 Manual Search filter after population if 'search' is provided
    if (search) {
      const searchRegex = new RegExp(search as string, "i");
      letters = letters.filter((l: any) => 
        (l.user?.name && searchRegex.test(l.user.name)) ||
        (l.user?.email && searchRegex.test(l.user.email)) ||
        (l.user?.employeeId && searchRegex.test(l.user.employeeId))
      );
    }

    res.json(letters);
  } catch (error) {
    console.error("Fetch all letters error:", error);
    res.status(500).json({
      message: "Failed to fetch letters",
    });
  }
};

/* ======================================================
   TOGGLE ARCHIVE LETTER (HR / ADMIN)
   ====================================================== */
export const toggleArchiveLetter = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const letter = await Letter.findById(id);

    if (!letter) {
      return res.status(404).json({ message: "Letter not found" });
    }

    if (letter.companyId?.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({
        message: "You can only manage letters for employees of your own company.",
      });
    }

    letter.isArchived = !letter.isArchived;
    await letter.save();

    res.json({
      message: letter.isArchived ? "Letter archived" : "Letter unarchived",
      letter,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to toggle archive status",
    });
  }
};
