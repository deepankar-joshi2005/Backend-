"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const constants_1 = require("../constants");
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI, {
            dbName: constants_1.dbName,
        });
        console.log("MongoDB connected");
    }
    catch (err) {
        console.error("MongoDB connection error:", err.message);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
