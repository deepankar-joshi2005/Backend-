import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import path from "path";
import { sanitizeInputs } from "./middleware/sanitize";
import routes from "./routes/index";
import { notFound, errorHandler } from "./middleware/errorMiddleware";

// HRMS — merged in as part of the same app/process (see hrms/ folder). Its own
// standalone server bootstrap (dotenv, httpServer, socket.io, listen) lives in
// server.ts now instead of a separate entry point.
import hrmsRouter from "./hrms/routes/root.routes";
import passport from "./hrms/config/googleOAuth";
import { getUploadsPath } from "./hrms/utils/uploadPaths";

const app = express();

// CSP left off deliberately: the frontend loads Razorpay's checkout.js from
// checkout.razorpay.com at runtime (BillingDashboard.tsx) and embeds its
// payment iframe — a default-self CSP would silently block that script and
// break payments. Helmet's other protections (X-Frame-Options, no-sniff,
// etc.) stay on.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: [process.env.CLIENT_URL || "http://localhost:5173"],
    credentials: true,
  })
);

// Shared body parser — HRMS needs a large limit for its bulk-upload feature;
// CA-Management's own payloads are far smaller and still fit comfortably under it.
app.use((req, res, next) => {
  if (req.path.includes("/bulk-upload/parse")) return next();
  express.json({ limit: "500mb" })(req, res, next);
});
app.use((req, res, next) => {
  if (req.path.includes("/bulk-upload/parse")) return next();
  express.urlencoded({ limit: "500mb", extended: true })(req, res, next);
});

app.use(cookieParser());
app.use(sanitizeInputs);

// HRMS's Google OAuth session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "hrms-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 },
  })
);
app.use(passport.initialize());
app.use(passport.session());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// HRMS static files (uploaded documents, 3D models)
app.use("/uploads", express.static(getUploadsPath()));
app.use("/models", express.static(path.join(__dirname, "hrms-public/models")));

// CA-Management's own API, plus HRMS mounted at /api — matches the
// "/hrms-api" proxy rule (CA-Frontend's vite.config.ts), which rewrites
// /hrms-api/* down to /api/* before it ever reaches this server.
app.use("/api/v1", routes);
app.use("/api", hrmsRouter);

// In dev, Vite's own dev server serves the frontend and proxies /api/* here.
// In production there's no Vite dev server, so this same process serves the
// built frontend directly — same two-entry-point MPA layout (index.html for
// CA-Management, hrms-app.html for HRMS), just served by Express instead of
// Vite. The /hrms-app/* rewrite below is the production equivalent of the
// hrmsAppFallback dev-server plugin in CA-Frontend/vite.config.ts.
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.join(__dirname, "..", "CA-Frontend", "dist");
  app.use(express.static(frontendDist));

  app.get(/^\/(?!api\/).*/, (req, res) => {
    const entry = req.path.startsWith("/hrms-app") ? "hrms-app.html" : "index.html";
    res.sendFile(path.join(frontendDist, entry));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
