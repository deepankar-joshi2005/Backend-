/** @format */

import { Request, Response } from "express";
import Appraisal from "../../models/hrms/Appraisal";
import { AuthRequest } from "../../middleware/auth";

/* ================= CREATE ================= */
export const createAppraisal = async (req: AuthRequest, res: Response) => {
  try {
    const appraisal = await Appraisal.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json(appraisal);
  } catch (error) {
    res.status(500).json({ message: "Failed to create appraisal", error });
  }
};

/* ================= GET ALL ================= */
export const getAppraisals = async (_req: AuthRequest, res: Response) => {
  try {
    const list = await Appraisal.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch appraisals" });
  }
};

/* ================= GET BY ID ================= */
export const getAppraisalById = async (req: AuthRequest, res: Response) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ message: "Appraisal not found" });
    }
    res.json(appraisal);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch appraisal" });
  }
};

/* ================= UPDATE ================= */
export const updateAppraisal = async (req: AuthRequest, res: Response) => {
  try {
    const updated = await Appraisal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Appraisal not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update appraisal" });
  }
};

/* ================= DELETE ================= */
export const deleteAppraisal = async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await Appraisal.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Appraisal not found" });
    }

    res.json({ message: "Appraisal deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete appraisal" });
  }
};
