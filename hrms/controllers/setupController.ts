import bcrypt from "bcrypt";
import { Request, Response } from "express";
import User from "../models/User";

export const completeSetup = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body || {};

    if (!password)
      return res
        .status(400)
        .json({ message: "Password is required to setup account" });

    const user = await User.findOne({ setupToken: token });
    if (!user) return res.status(400).json({ message: "Invalid token" });

    user.password = await bcrypt.hash(password, 10);
    user.isVerified = true;
    user.setupToken = "";

    await user.save();
    res.json({ message: "Account setup complete. You can now log in." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserBySetupToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ setupToken: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
