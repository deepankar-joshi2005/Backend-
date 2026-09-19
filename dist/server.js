"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const db_1 = __importDefault(require("./config/db"));
const app_1 = __importDefault(require("./app"));
const messageSocket_1 = require("./hrms/socket/messageSocket");
const subscriptionJob_1 = require("./hrms/jobs/subscriptionJob");
(0, db_1.default)();
const PORT = process.env.PORT || 5000;
const httpServer = (0, http_1.createServer)(app_1.default);
// HRMS's realtime chat/notifications — attached to the same shared server.
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173"],
        credentials: true,
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
});
app_1.default.set("io", io);
(0, messageSocket_1.setupSocketHandlers)(io);
httpServer.listen(PORT, () => {
    (0, subscriptionJob_1.startSubscriptionJobs)();
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.io is ready for connections`);
});
