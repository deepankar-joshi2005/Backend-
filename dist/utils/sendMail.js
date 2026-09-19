"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = sendMail;
const nodemailer_1 = __importDefault(require("nodemailer"));
let transporter = null;
function getTransporter() {
    if (transporter)
        return transporter;
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS)
        return null;
    transporter = nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return transporter;
}
// SMTP_FROM is a friendly display name (e.g. "CA Management"), not a mailbox — the
// envelope address must still be the authenticated SMTP_USER or most providers (Gmail
// included) reject the send.
function buildFromHeader() {
    const label = process.env.SMTP_FROM;
    if (label && label.includes("@"))
        return label;
    return `"${label || "CA Management"}" <${process.env.SMTP_USER}>`;
}
// Fire-and-forget by convention at the call site — a failed email must never
// break the action that triggered it (e.g. CA firm onboarding).
async function sendMail({ to, subject, html }) {
    const client = getTransporter();
    if (!client) {
        console.warn(`SMTP not configured — skipped email "${subject}" to ${to}`);
        return;
    }
    await client.sendMail({
        from: buildFromHeader(),
        to,
        subject,
        html,
    });
}
