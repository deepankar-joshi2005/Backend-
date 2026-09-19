"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleArchiveLetter = exports.getAllLetters = exports.getLettersByUser = exports.sendLetter = void 0;
const Letter_1 = __importDefault(require("../../models/hrms/Letter"));
const User_1 = __importDefault(require("../../models/User"));
const email_1 = require("../../utils/email");
/* ======================================================
   SEND LETTER (HR / ADMIN)
   ====================================================== */
const sendLetter = async (req, res) => {
    var _a;
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
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (((_a = user.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== req.user.companyId.toString()) {
            return res.status(403).json({
                message: "You can only send letters to employees of your own company.",
            });
        }
        const letter = await Letter_1.default.create({
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
        await (0, email_1.sendLetterEmail)({
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to send letter",
        });
    }
};
exports.sendLetter = sendLetter;
/* ======================================================
   GET LETTERS BY USER (Employee)
   ====================================================== */
const getLettersByUser = async (req, res) => {
    try {
        const letters = await Letter_1.default.find({
            user: req.params.userId,
        })
            .populate("sentBy", "name role")
            .sort({ createdAt: -1 });
        res.json(letters);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch letters",
        });
    }
};
exports.getLettersByUser = getLettersByUser;
/* ======================================================
   GET ALL LETTERS (HR / ADMIN)
   ====================================================== */
const getAllLetters = async (req, res) => {
    try {
        const { userId, letterType, startDate, endDate, search } = req.query;
        const filter = {
            // Scope to the requester's own company; requesters with no company see nothing.
            companyId: req.user.companyId || null,
        };
        if (userId)
            filter.user = userId;
        if (letterType)
            filter.letterType = letterType;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate)
                filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }
        let query = Letter_1.default.find(filter)
            .populate({
            path: "user",
            select: "name role email employeeId",
        })
            .populate("sentBy", "name role")
            .sort({ createdAt: -1 });
        let letters = await query;
        // 🔍 Manual Search filter after population if 'search' is provided
        if (search) {
            const searchRegex = new RegExp(search, "i");
            letters = letters.filter((l) => {
                var _a, _b, _c;
                return (((_a = l.user) === null || _a === void 0 ? void 0 : _a.name) && searchRegex.test(l.user.name)) ||
                    (((_b = l.user) === null || _b === void 0 ? void 0 : _b.email) && searchRegex.test(l.user.email)) ||
                    (((_c = l.user) === null || _c === void 0 ? void 0 : _c.employeeId) && searchRegex.test(l.user.employeeId));
            });
        }
        res.json(letters);
    }
    catch (error) {
        console.error("Fetch all letters error:", error);
        res.status(500).json({
            message: "Failed to fetch letters",
        });
    }
};
exports.getAllLetters = getAllLetters;
/* ======================================================
   TOGGLE ARCHIVE LETTER (HR / ADMIN)
   ====================================================== */
const toggleArchiveLetter = async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        const letter = await Letter_1.default.findById(id);
        if (!letter) {
            return res.status(404).json({ message: "Letter not found" });
        }
        if (((_a = letter.companyId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = req.user.companyId) === null || _b === void 0 ? void 0 : _b.toString())) {
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
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to toggle archive status",
        });
    }
};
exports.toggleArchiveLetter = toggleArchiveLetter;
