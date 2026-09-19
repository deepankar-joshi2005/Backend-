/** @format */

import { Request, Response } from "express";
import AccessCard from "../../models/hrms/AccessCard";

/* ================= ISSUE CARD ================= */
export const issueCard = async (req: Request, res: Response) => {
  try {
    const { employee, cardType, cardNumber, accessLevel, remarks } = req.body;

    if (!employee || !cardType || !cardNumber || !accessLevel) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    const existing = await AccessCard.findOne({ cardNumber });
    if (existing) {
      return res.status(409).json({
        message: "Card number already exists",
      });
    }

    const card = await AccessCard.create({
      employee,
      cardType,
      cardNumber,
      accessLevel,
      remarks,
      status: "ACTIVE",
    });

    res.status(201).json({
      message: "Card issued successfully",
      data: card,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to issue card",
      error,
    });
  }
};

/* ================= GET ALL CARDS ================= */
export const getAllCards = async (_: Request, res: Response) => {
  try {
    const cards = await AccessCard.find()
      .populate("employee", "name role email")
      .sort({ createdAt: -1 });

    res.json(cards);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch cards",
      error,
    });
  }
};

/* ================= RETURN / BLOCK CARD ================= */
export const updateCardStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["RETURNED", "BLOCKED","ACTIVE"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const card = await AccessCard.findById(id);
    if (!card) {
      return res.status(404).json({
        message: "Card not found",
      });
    }

    card.status = status;
    if (status === "RETURNED") {
      card.returnedAt = new Date();
    }

    await card.save();

    res.json({
      message: "Card status updated",
      data: card,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update card",
      error,
    });
  }
};
/* ================= UPDATE CARD DETAILS ================= */
export const updateCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cardType, cardNumber, accessLevel, remarks } = req.body;

    if (!cardType || !cardNumber || !accessLevel) {
      return res.status(400).json({
        message: "Card type, number and access level are required",
      });
    }

    const card = await AccessCard.findById(id);
    if (!card) {
      return res.status(404).json({
        message: "Card not found",
      });
    }

    // 🔒 Prevent duplicate card number
    const duplicate = await AccessCard.findOne({
      cardNumber,
      _id: { $ne: id },
    });

    if (duplicate) {
      return res.status(409).json({
        message: "Card number already exists",
      });
    }

    card.cardType = cardType;
    card.cardNumber = cardNumber;
    card.accessLevel = accessLevel;
    card.remarks = remarks;

    await card.save();

    res.json({
      message: "Card updated successfully",
      data: card,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update card",
      error,
    });
  }
};
