"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const root_routes_1 = __importDefault(require("./routes/root.routes"));
const db_1 = require("./config/db");
const messageSocket_1 = require("./socket/messageSocket");
const uploadPaths_1 = require("./utils/uploadPaths");
const googleOAuth_1 = __importDefault(require("./config/googleOAuth"));
const express_session_1 = __importDefault(require("express-session"));
const subscriptionJob_1 = require("./jobs/subscriptionJob");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 8000;
// Initialize Socket.io
const io = new socket_io_1.Server(httpServer, {
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
    express_1.default.json({ limit: "500mb" })(req, res, next);
});
app.use((req, res, next) => {
    if (req.path.includes("/bulk-upload/parse")) {
        return next();
    }
    express_1.default.urlencoded({ limit: "500mb", extended: true })(req, res, next);
});
// Session configuration for OAuth
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
}));
// Initialize Passport
app.use(googleOAuth_1.default.initialize());
app.use(googleOAuth_1.default.session());
// CORS must be applied *before* any static routes so those responses get the headers too
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://thinkprolms-frontend.onrender.com",
        "https://lmx.shrawantravels.com",
    ],
    credentials: true,
}));
// Serve static files from uploads directory
app.use("/uploads", express_1.default.static((0, uploadPaths_1.getUploadsPath)()));
// Serve static 3D models from backend public/models so frontend can load GLB files
app.use("/models", express_1.default.static(path_1.default.join(__dirname, "../public/models")));
// Routes
app.use("/api", root_routes_1.default);
// Setup Socket.io handlers
(0, messageSocket_1.setupSocketHandlers)(io);
httpServer.listen(PORT, () => {
    // Connect DB
    (0, db_1.connectDB)();
    // Start Background Job for Subscriptions
    (0, subscriptionJob_1.startSubscriptionJobs)();
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Socket.io is ready for connections`);
});
