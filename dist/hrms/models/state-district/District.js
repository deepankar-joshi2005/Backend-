"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const districtSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    state: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "State",
        required: true,
    },
    country: { type: String, required: true, default: "India" },
}, { timestamps: true });
exports.default = mongoose_1.default.model("District", districtSchema);
