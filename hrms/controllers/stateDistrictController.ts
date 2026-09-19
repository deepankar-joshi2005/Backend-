import { Request, Response } from "express";
import mongoose from "mongoose";
import District from "../models/state-district/District";
import State from "../models/state-district/State";

export const getStates = async (_req: Request, res: Response) => {
  try {
    const states = await State.find().sort({ name: 1 }).select("name code").lean();

    return res.json(states);
  } catch (error) {
    console.error("Failed to fetch states:", error);
    return res.status(500).json({ message: "Failed to fetch states" });
  }
};

export const getDistrictsByState = async (req: Request, res: Response) => {
  try {
    const { stateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(stateId)) {
      return res.status(400).json({ message: "Invalid state id" });
    }

    const stateExists = await State.exists({ _id: stateId });
    if (!stateExists) {
      return res.status(404).json({ message: "State not found" });
    }

    const districts = await District.find({ state: stateId })
      .sort({ name: 1 })
      .select("name code")
      .lean();

    return res.json(districts);
  } catch (error) {
    console.error("Failed to fetch districts:", error);
    return res.status(500).json({ message: "Failed to fetch districts" });
  }
};


