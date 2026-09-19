import User from "../models/User";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { verifyAccessToken } from "../utils/generateToken";

export const protect = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw new ApiError(401, "Not authenticated");

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, "Account not found or disabled");
  if (user.tokenVersion !== payload.tokenVersion) {
    throw new ApiError(401, "Session expired, please log in again");
  }

  req.user = {
    id: user._id.toString(),
    role: user.role,
    caFirmId: user.caFirmId ? user.caFirmId.toString() : null,
    businessClientId: user.businessClientId ? user.businessClientId.toString() : null,
  };
  req.currentUser = user;
  next();
});
