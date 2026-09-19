"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemSettings = getSystemSettings;
const SystemSettings_1 = __importDefault(require("../models/SystemSettings"));
// Settings are a lazily-created singleton document — always read fresh from
// the DB (no in-process caching) so admin changes take effect immediately.
async function getSystemSettings() {
    let settings = await SystemSettings_1.default.findOne();
    if (!settings)
        settings = await SystemSettings_1.default.create({});
    return settings;
}
