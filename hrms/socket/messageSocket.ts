import { Server, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";
import User from "../models/User";
import { ROLES } from "../constants";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

// Store online users: userId -> socketId
const onlineUsers = new Map<string, string>();

// Store the io instance for external access
let ioInstance: Server | null = null;

export const setupSocketHandlers = (io: Server) => {
  // Store the io instance
  ioInstance = io;
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = verifyToken(token) as any;
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    
    console.log(`✅ User connected: ${userId}`);

    // Store user's socket connection
    onlineUsers.set(userId, socket.id);

    // Emit online status to all connected clients
    io.emit("user:online", { userId });

    // Send current online users to the newly connected user
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit("users:online", { userIds: onlineUserIds });

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${userId}`);
      
      // Remove from online users
      onlineUsers.delete(userId);

      // Emit offline status
      io.emit("user:offline", { userId });
    });
  });
};

// Export functions and variables for external use
export const getOnlineUsers = () => onlineUsers;
export const getSocketIO = () => ioInstance;

