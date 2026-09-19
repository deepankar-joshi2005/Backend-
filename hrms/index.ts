import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import rootRouter from "./routes/root.routes";
import { connectDB } from "./config/db";
import { setupSocketHandlers } from "./socket/messageSocket";
import { getUploadsPath } from "./utils/uploadPaths";
import passport from "./config/googleOAuth";
import session from "express-session";
import { activityLogger } from "./middleware/activityLogger";
import cron from "node-cron";
import { startSubscriptionJobs } from "./jobs/subscriptionJob";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8000;

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5174",
      "https://thinkprolms-frontend.onrender.com",
      "https://lmx.shrawantravels.com",
    ],
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io accessible to routes
app.set("io", io);

// Middleware
app.use((req, res, next) => {
  if (req.path.includes("/bulk-upload/parse")) {
    return next();
  }
  express.json({ limit: "500mb" })(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.includes("/bulk-upload/parse")) {
    return next();
  }
  express.urlencoded({ limit: "500mb", extended: true })(req, res, next);
});

// Session configuration for OAuth
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// CORS must be applied *before* any static routes so those responses get the headers too
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://thinkprolms-frontend.onrender.com",
      "https://lmx.shrawantravels.com",
    ],
    credentials: true,
  })
); 

// Serve static files from uploads directory
app.use("/uploads", express.static(getUploadsPath()));

// Serve static 3D models from backend public/models so frontend can load GLB files
app.use(
  "/models",
  express.static(path.join(__dirname, "../public/models"))
);

// Routes
app.use("/api", rootRouter);

// Setup Socket.io handlers
setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  // Connect DB
  connectDB();

  // Start Background Job for Subscriptions
  startSubscriptionJobs();

  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Socket.io is ready for connections`);
});
