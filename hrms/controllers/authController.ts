import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User";
import { generateToken } from "../utils/jwt";
import { ROLES } from "../constants";
import { isValidPhoneNumber } from "../utils/validation";
import passport from "../config/googleOAuth";
import { logActivity } from "../middleware/activityLogger";
import { AuthRequest } from "../middleware/auth";
import { sendForgotPasswordEmail } from "../utils/email";

// LOGIN
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  console.log("USER:", user);
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password!);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  // Check if user is active
  if (user.status !== "ACTIVE") {
    // Log failed login attempt
    await logActivity(
      user._id.toString(),
      user.email,
      user.name || "Unknown User",
      user.role,
      "LOGIN",
      "USER",
      `Failed login attempt - account deactivated`,
      { email, reason: "Account deactivated" },
      {
        isSuccess: false,
        errorMessage: "Account deactivated",
        ipAddress: req.ip || req.connection.remoteAddress || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
        severity: "MEDIUM"
      }
    );

    return res.status(403).json({
      message:
        "Your account has been deactivated. Please contact your administrator.",
    });
  }

  // Auto-verify on first login
  if (!user.isVerified) {
    user.isVerified = true;
    await user.save();
  }

  const token = generateToken({
    id: user._id,
    role: user.role,
  });

  // Log successful login
  await logActivity(
    user._id.toString(),
    user.email,
    user.name || "Unknown User",
    user.role,
    "LOGIN",
    "USER",
    `Successful login`,
    { email, isFirstLogin: !user.isVerified },
    {
      isSuccess: true,
      ipAddress: req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      severity: "LOW"
    }
  );

  const populatedUser = await User.findById(user._id).populate("companyId");
  const company = populatedUser?.companyId as any;

  res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      companyId: user.companyId || null,
      subscriptionPlan: company?.subscriptionPlan || "TRIAL",
      trialEndDate: company?.trialEndDate || null,
      subscriptionEndDate: company?.subscriptionEndDate || null,
      isSystemAdmin: user.isSystemAdmin || false,
      companyLogo: company?.logo || null,
      companyStamp: company?.stamp || null,
      isTrainee: user.isTrainee || false,
    },
  });
};

// GUEST REGISTRATION REMOVED

// GOOGLE OAUTH ROUTES
export const googleAuth = (req: Request, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({
      message: "Google OAuth not configured. Please contact administrator.",
    });
  }

  return passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res);
};

export const googleCallback = async (req: Request, res: Response) => {
  console.log("Google OAuth callback received");

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const frontendUrl =
      (process.env.FRONTEND_URL! as string) || "http://localhost:5173";
    console.log("Google OAuth not configured, redirecting to frontend");
    return res.redirect(
      `${frontendUrl}/guest/login?error=google_not_configured`
    );
  }

  const frontendUrl =
    (process.env.FRONTEND_URL! as string) || "http://localhost:5173";
  console.log("Frontend URL:", frontendUrl);

  return passport.authenticate(
    "google",
    { failureRedirect: `${frontendUrl}/guest/login?error=google_auth_failed` },
    async (err: any, user: any) => {
      if (err) {
        console.error("Google OAuth error:", err);
        return res.redirect(
          `${frontendUrl}/login?error=google_auth_error`
        );
      }

      if (!user) {
        console.log("No user returned from Google OAuth");
        return res.redirect(
          `${frontendUrl}/login?error=google_auth_failed`
        );
      }

      console.log("Google OAuth successful for user:", user.email);

      // Look up the user by email
      const userEmail = user.email || user;
      const dbUser = await User.findOne({ email: userEmail });

      if (!dbUser) {
        console.error("User not found in database:", userEmail);
        return res.redirect(
          `${frontendUrl}/login?error=user_not_found`
        );
      }

      // Generate token for the user
      const token = generateToken({
        id: dbUser._id,
        role: dbUser.role,
      });

      // Prepare user data
      const userData = {
        id: dbUser._id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name,
        companyId: dbUser.companyId || null,
        isSystemAdmin: dbUser.isSystemAdmin || false,
      };

      // Redirect to frontend with token and user data
      res.redirect(
        `${frontendUrl}/login?token=${token}&user=${encodeURIComponent(
          JSON.stringify(userData)
        )}`
      );
    }
  )(req, res);
};

// GUEST PROFILE LOGIC REMOVED

// Get current user info - returns basic user information including isSystemAdmin
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const populatedUser = await User.findById(user._id).populate("companyId");
    const company = populatedUser?.companyId as any;

    const now = new Date();
    let subscriptionPlan = company?.subscriptionPlan || "TRIAL";
    const currentPlan = (subscriptionPlan as string).toUpperCase();

    // 🛡️ Robust Check: Force EXPIRED if dates have passed (Handles TRIAL/TRAIL typo)
    if ((currentPlan === "TRIAL" || currentPlan === "TRAIL") && company?.trialEndDate && now > new Date(company.trialEndDate)) {
      subscriptionPlan = "EXPIRED";
    } else if (currentPlan === "ACTIVE" && company?.subscriptionEndDate && now > new Date(company.subscriptionEndDate)) {
      subscriptionPlan = "EXPIRED";
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        companyId: user.companyId || null,
        subscriptionPlan: subscriptionPlan,
        trialEndDate: company?.trialEndDate || null,
        subscriptionEndDate: company?.subscriptionEndDate || null,
        isSystemAdmin: user.isSystemAdmin || false,
        isCaProxy: user.isCaProxy || false,
        profilePicture: user.profilePicture || null,
        companyLogo: company?.logo || null,
        companyStamp: company?.stamp || null,
        isTrainee: user.isTrainee || false,
      },
    });
  } catch (error: any) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Failed to get user info", error: error.message });
  }
};

// FORGOT PASSWORD - Request password reset
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // If no user found, return explicit error
    if (!user) {
      return res.status(404).json({
        message: "No account found with this email address",
      });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token expires in 1 hour

    // Save token and expiry to user
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Send email with reset link
    try {
      await sendForgotPasswordEmail({
        to: user.email,
        name: user.name || "User",
        token: resetToken,
      });
    } catch (emailError: any) {
      console.error("Error sending forgot password email:", emailError);
      // Don't fail the request if email fails, just log it
    }

    res.json({
      message: "Password reset link sent successfully",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to process request", error: error.message });
  }
};

// RESET PASSWORD WITH TOKEN - Reset password using token from email
export const resetPasswordWithToken = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Find user by reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetTokenExpiry: { $gt: new Date() }, // Token must not be expired
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token. Please request a new password reset.",
      });
    }

    // Hash and set new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Clear reset token fields (cast to any to satisfy TypeScript typings)
    (user as any).passwordResetToken = null;
    (user as any).passwordResetTokenExpiry = null;

    await user.save();

    // Log password reset activity
    try {
      await logActivity(
        user._id.toString(),
        user.email,
        user.name || "Unknown User",
        user.role,
        "PASSWORD_RESET",
        "USER",
        `Password reset via forgot password flow`,
        { email: user.email },
        {
          isSuccess: true,
          ipAddress: req.ip || req.connection.remoteAddress || "unknown",
          userAgent: req.headers["user-agent"] || "unknown",
          severity: "LOW"
        }
      );
    } catch (logError) {
      console.error("Error logging password reset activity:", logError);
      // Don't fail the request if logging fails
    }

    res.json({
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error: any) {
    console.error("Reset password with token error:", error);
    res.status(500).json({ message: "Failed to reset password", error: error.message });
  }
};
