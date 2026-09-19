"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocketIO = exports.getOnlineUsers = exports.setupSocketHandlers = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = __importDefault(require("../models/User"));
// Store online users: userId -> socketId
const onlineUsers = new Map();
// Store the io instance for external access
let ioInstance = null;
const setupSocketHandlers = (io) => {
    // Store the io instance
    ioInstance = io;
    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error("Authentication error"));
            }
            const decoded = (0, jwt_1.verifyToken)(token);
            const user = await User_1.default.findById(decoded.id);
            if (!user) {
                return next(new Error("User not found"));
            }
            socket.userId = user._id.toString();
            socket.userRole = user.role;
            next();
        }
        catch (error) {
            next(new Error("Authentication error"));
        }
    });
    io.on("connection", (socket) => {
        const userId = socket.userId;
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
exports.setupSocketHandlers = setupSocketHandlers;
// Export functions and variables for external use
const getOnlineUsers = () => onlineUsers;
exports.getOnlineUsers = getOnlineUsers;
const getSocketIO = () => ioInstance;
exports.getSocketIO = getSocketIO;
