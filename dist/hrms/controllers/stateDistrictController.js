"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDistrictsByState = exports.getStates = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const District_1 = __importDefault(require("../models/state-district/District"));
const State_1 = __importDefault(require("../models/state-district/State"));
const getStates = async (_req, res) => {
    try {
        const states = await State_1.default.find().sort({ name: 1 }).select("name code").lean();
        return res.json(states);
    }
    catch (error) {
        console.error("Failed to fetch states:", error);
        return res.status(500).json({ message: "Failed to fetch states" });
    }
};
exports.getStates = getStates;
const getDistrictsByState = async (req, res) => {
    try {
        const { stateId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(stateId)) {
            return res.status(400).json({ message: "Invalid state id" });
        }
        const stateExists = await State_1.default.exists({ _id: stateId });
        if (!stateExists) {
            return res.status(404).json({ message: "State not found" });
        }
        const districts = await District_1.default.find({ state: stateId })
            .sort({ name: 1 })
            .select("name code")
            .lean();
        return res.json(districts);
    }
    catch (error) {
        console.error("Failed to fetch districts:", error);
        return res.status(500).json({ message: "Failed to fetch districts" });
    }
};
exports.getDistrictsByState = getDistrictsByState;
