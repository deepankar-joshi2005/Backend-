/** @format */

import { Request, Response } from "express";
import Asset from "../../models/hrms/AssetInventory";

/* ---------------- CREATE ASSET ---------------- */
export const createAsset = async (req: Request, res: Response) => {
  try {
    const { assetType, serialNumber, warrantyExpiry, accessories, status } =
      req.body;

    if (!serialNumber) {
      return res.status(400).json({
        message: "Serial number is required",
      });
    }

    const asset = await Asset.create({
      assetType,
      serialNumber,
      warrantyExpiry,
      accessories,
      status,
    });

    res.status(201).json({
      message: "Asset added successfully",
      data: asset,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Asset with this serial number already exists",
      });
    }

    res.status(500).json({ message: "Server Error", error });
  }
};

/* ---------------- GET ALL ASSETS ---------------- */
export const getAssets = async (_req: Request, res: Response) => {
  try {
    const assets = await Asset.find()
      .populate({
        path: "assignedTo",
        select: "name email", // jo frontend me dikhana ho
      })
      .sort({ createdAt: -1 });

    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};


/* ---------------- GET SINGLE ASSET ---------------- */
export const getAssetById = async (req: Request, res: Response) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json(asset);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
/* ---------------- UPDATE ASSET ---------------- */
export const updateAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { warrantyExpiry, accessories, status } = req.body;

    const asset = await Asset.findByIdAndUpdate(
      id,
      {
        warrantyExpiry,
        accessories,
        status,
      },
      { new: true }
    );

    if (!asset) {
      return res.status(404).json({
        message: "Asset not found",
      });
    }

    res.json({
      message: "Asset updated successfully",
      data: asset,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
/* ---------------- DELETE ASSET ---------------- */
export const deleteAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const asset = await Asset.findByIdAndDelete(id);

    if (!asset) {
      return res.status(404).json({
        message: "Asset not found",
      });
    }

    res.json({
      message: "Asset deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
/* ---------------- ASSIGN / RE-ASSIGN ASSET ---------------- */
export const assignAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // asset id
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        message: "Employee ID is required",
      });
    }

    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({
        message: "Asset not found",
      });
    }

    asset.assignedTo = employeeId;
    asset.status = "ASSIGNED";

    await asset.save();

    res.json({
      message: "Asset assigned successfully",
      data: asset,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
/* ---------------- UNASSIGN ASSET ---------------- */
export const unassignAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({
        message: "Asset not found",
      });
    }

    asset.assignedTo = null;
    asset.status = "AVAILABLE";

    await asset.save();

    res.json({
      message: "Asset unassigned successfully",
      data: asset,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

