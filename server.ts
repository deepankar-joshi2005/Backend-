import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db";
import app from "./app";
import { setupSocketHandlers } from "./hrms/socket/messageSocket";
import { startSubscriptionJobs } from "./hrms/jobs/subscriptionJob";

connectDB();

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

// HRMS's realtime chat/notifications — attached to the same shared server.
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.CLIENT_URL || "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});
app.set("io", io);
setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  startSubscriptionJobs();
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io is ready for connections`);
});
