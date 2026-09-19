"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTempPassword = generateTempPassword;
const crypto_1 = __importDefault(require("crypto"));
// Generates a readable temporary password, e.g. "Kf3-Tqz8-Rn2p".
function generateTempPassword() {
    const chunk = () => crypto_1.default.randomBytes(3).toString("hex");
    return `${chunk()}-${chunk()}-${chunk()}`;
}
