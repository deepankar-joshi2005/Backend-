/** @format */

import { Request, Response } from "express";
import NonITAsset from "../../models/hrms/NonITAsset";
import mongoose from "mongoose";
/* ================= CREATE ASSET ================= */
export const createAsset = async (req: Request, res: Response) => {
  try {
    const asset = await NonITAsset.create(req.body);
    res.status(201).json(asset);
  } catch (err: any) {
    res.status(400).json({
      message: err.message || "Failed to create asset",
    });
  }
};

/* ================= GET ALL ASSETS ================= */
export const getAllAssets = async (_req: Request, res: Response) => {
  try {
    const assets = await NonITAsset.find()
      .populate({
        path: "assignedTo.user",
        select: "name role employeeCode",
      })
      .sort({ createdAt: -1 });

    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch assets" });
  }
};


/* ================= GET SINGLE ASSET ================= */
export const getAssetById = async (req: Request, res: Response) => {
  try {
    const asset = await NonITAsset.findById(req.params.id).populate(
      "assignedTo",
      "name role employeeCode"
    );

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json(asset);
  } catch {
    res.status(400).json({ message: "Invalid asset ID" });
  }
};

/* ================= UPDATE ASSET ================= */
export const updateAsset = async (req: Request, res: Response) => {
  try {
    const asset = await NonITAsset.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json(asset);
  } catch {
    res.status(400).json({ message: "Failed to update asset" });
  }
};

/* ================= DELETE ASSET ================= */
export const deleteAsset = async (req: Request, res: Response) => {
  try {
    const asset = await NonITAsset.findByIdAndDelete(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json({ message: "Asset deleted successfully" });
  } catch {
    res.status(400).json({ message: "Failed to delete asset" });
  }
};
/* ================= MARK ASSET DAMAGED ================= */
export const markAssetDamaged = async (req: Request, res: Response) => {
  try {
    const { count } = req.body;

    if (!count || count <= 0) {
      return res.status(400).json({
        message: "Damaged count must be greater than 0",
      });
    }

    const asset = await NonITAsset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }
    const assigned = Array.isArray(asset.assignedTo)
      ? asset.assignedTo.length
      : asset.assignedTo
      ? 1
      : 0;
    const issuedCount = assigned;
    const available =
      asset.quantity - issuedCount - (asset.damagedCount || 0);

    if (count > available) {
      return res.status(400).json({
        message: "Damaged count exceeds available quantity",
      });
    }

    asset.damagedCount = (asset.damagedCount || 0) + count;

    // optional: status update
    if (asset.damagedCount === asset.quantity) {
      asset.status = "DISPOSED";
    } else {
      asset.status = "DAMAGED";
    }

    await asset.save();

    res.json({
      message: "Asset marked as damaged successfully",
      asset,
    });
  } catch (err: any) {
    res.status(400).json({
      message: err.message || "Failed to mark asset as damaged",
    });
  }
};
/* ================= ASSIGN NON-IT ASSET ================= */

export const assignNonITAsset = async (req: Request, res: Response) => {
  try {
    const { userId, quantity } = req.body;

    const asset = await NonITAsset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    /* 🔒 NULL SAFE */
    if (!asset.assignedTo) {
      asset.assignedTo = [];
    }

    const issuedQty = asset.assignedTo.reduce((sum, a) => sum + a.quantity, 0);

    const availableQty = asset.quantity - issuedQty - asset.damagedCount;

    if (quantity > availableQty) {
      return res
        .status(400)
        .json({ message: `Only ${availableQty} available` });
    }

    const existing = asset.assignedTo.find((a) => a.user.toString() === userId);

    if (existing) {
      existing.quantity += quantity;
    } else {
      asset.assignedTo.push({
        user: new mongoose.Types.ObjectId(userId),
        quantity,
      });
    }

    asset.status = "ASSIGNED";
    await asset.save();

    const newIssuedQty = asset.assignedTo.reduce(
      (sum, a) => sum + a.quantity,
      0
    );

    res.json({
      message: "Asset assigned successfully",
      assignedTo: asset.assignedTo,
      issuedQty: newIssuedQty,
      availableQty: asset.quantity - newIssuedQty - asset.damagedCount,
    });
  } catch (err) {
    console.error("ASSIGN ERROR:", err);
    res.status(500).json({ message: "Assign failed" });
  }
};

/* ================= DISPOSE ASSET FOR EMPLOYEE ================= */
export const disposeAssetForEmployee = async (
  req: Request,
  res: Response
) => {
  try {
    const { assetId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const asset = await NonITAsset.findById(assetId);

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    if (!asset.assignedTo || asset.assignedTo.length === 0) {
      return res.status(400).json({
        message: "No assignments found for this asset",
      });
    }

    /* 🔥 FIND EMPLOYEE ASSIGNMENT */
    const assignmentIndex = asset.assignedTo.findIndex(
      (a) => a.user.toString() === userId
    );

    if (assignmentIndex === -1) {
      return res.status(404).json({
        message: "This employee does not have this asset assigned",
      });
    }

    /* 🔥 REMOVE EMPLOYEE ASSIGNMENT (DISPOSE) */
    const disposedQuantity = asset.assignedTo[assignmentIndex].quantity;

    asset.assignedTo.splice(assignmentIndex, 1);

    /* 🔥 STATUS LOGIC */
    if (asset.assignedTo.length === 0) {
      asset.status = "DISPOSED";
    } else {
      asset.status = "ASSIGNED";
    }

    await asset.save();

    res.json({
      message: "Asset disposed for employee successfully",
      disposedQuantity,
      remainingAssignments: asset.assignedTo,
      assetStatus: asset.status,
    });
  } catch (error) {
    console.error("DISPOSE ERROR:", error);
    res.status(500).json({ message: "Dispose failed" });
  }
};
