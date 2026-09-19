"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const path_1 = __importDefault(require("path"));
const sanitize_1 = require("./middleware/sanitize");
const index_1 = __importDefault(require("./routes/index"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
// HRMS — merged in as part of the same app/process (see hrms/ folder). Its own
// standalone server bootstrap (dotenv, httpServer, socket.io, listen) lives in
// server.ts now instead of a separate entry point.
const root_routes_1 = __importDefault(require("./hrms/routes/root.routes"));
const googleOAuth_1 = __importDefault(require("./hrms/config/googleOAuth"));
const uploadPaths_1 = require("./hrms/utils/uploadPaths");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [process.env.CLIENT_URL || "http://localhost:5173"],
    credentials: true,
}));
// Shared body parser — HRMS needs a large limit for its bulk-upload feature;
// CA-Management's own payloads are far smaller and still fit comfortably under it.
app.use((req, res, next) => {
    if (req.path.includes("/bulk-upload/parse"))
        return next();
    express_1.default.json({ limit: "500mb" })(req, res, next);
});
app.use((req, res, next) => {
    if (req.path.includes("/bulk-upload/parse"))
        return next();
    express_1.default.urlencoded({ limit: "500mb", extended: true })(req, res, next);
});
app.use((0, cookie_parser_1.default)());
app.use(sanitize_1.sanitizeInputs);
// HRMS's Google OAuth session
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "hrms-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 },
}));
app.use(googleOAuth_1.default.initialize());
app.use(googleOAuth_1.default.session());
if (process.env.NODE_ENV !== "production") {
    app.use((0, morgan_1.default)("dev"));
}
// HRMS static files (uploaded documents, 3D models)
app.use("/uploads", express_1.default.static((0, uploadPaths_1.getUploadsPath)()));
app.use("/models", express_1.default.static(path_1.default.join(__dirname, "hrms-public/models")));
// CA-Management's own API, plus HRMS mounted at /api — matches the
// "/hrms-api" proxy rule (CA-Frontend's vite.config.ts), which rewrites
// /hrms-api/* down to /api/* before it ever reaches this server.
app.use("/api/v1", index_1.default);
app.use("/api", root_routes_1.default);
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
exports.default = app;
