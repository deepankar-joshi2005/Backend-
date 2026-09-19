"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRole = exports.updateRole = exports.getRoleById = exports.getAllRoles = exports.createRole = void 0;
const Role_1 = __importDefault(require("../../models/Role"));
/**
 * CREATE ROLE
 */
const createRole = async (req, res) => {
    try {
        const role = await Role_1.default.create(req.body);
        res.status(201).json(role);
    }
    catch (error) {
        res.status(400).json({
            message: "Failed to create role",
            error: error.message,
        });
    }
};
exports.createRole = createRole;
/**
 * GET ALL ROLES
 */
const getAllRoles = async (_req, res) => {
    try {
        const roles = await Role_1.default.find().sort({ createdAt: -1 });
        res.json(roles);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch roles",
            error: error.message,
        });
    }
};
exports.getAllRoles = getAllRoles;
/**
 * GET ROLE BY ID
 */
const getRoleById = async (req, res) => {
    try {
        const role = await Role_1.default.findById(req.params.id);
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        res.json(role);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch role",
            error: error.message,
        });
    }
};
exports.getRoleById = getRoleById;
/**
 * UPDATE ROLE
 */
const updateRole = async (req, res) => {
    try {
        const role = await Role_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        res.json(role);
    }
    catch (error) {
        res.status(400).json({
            message: "Failed to update role",
            error: error.message,
        });
    }
};
exports.updateRole = updateRole;
/**
 * DELETE ROLE
 */
const deleteRole = async (req, res) => {
    try {
        const role = await Role_1.default.findByIdAndDelete(req.params.id);
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        res.json({ message: "Role deleted successfully" });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to delete role",
            error: error.message,
        });
    }
};
exports.deleteRole = deleteRole;
