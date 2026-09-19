"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBySetupToken = exports.completeSetup = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = __importDefault(require("../models/User"));
const completeSetup = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body || {};
        if (!password)
            return res
                .status(400)
                .json({ message: "Password is required to setup account" });
        const user = await User_1.default.findOne({ setupToken: token });
        if (!user)
            return res.status(400).json({ message: "Invalid token" });
        user.password = await bcrypt_1.default.hash(password, 10);
        user.isVerified = true;
        user.setupToken = "";
        await user.save();
        res.json({ message: "Account setup complete. You can now log in." });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.completeSetup = completeSetup;
const getUserBySetupToken = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User_1.default.findOne({ setupToken: token });
        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getUserBySetupToken = getUserBySetupToken;
