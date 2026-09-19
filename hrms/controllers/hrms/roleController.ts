/** @format */

import { Request, Response } from "express";
import Role from "../../models/Role";

/**
 * CREATE ROLE
 */
export const createRole = async (req: Request, res: Response) => {
  try {
    const role = await Role.create(req.body);

    res.status(201).json(role);
  } catch (error: any) {
    res.status(400).json({
      message: "Failed to create role",
      error: error.message,
    });
  }
};

/**
 * GET ALL ROLES
 */
export const getAllRoles = async (_req: Request, res: Response) => {
  try {
    const roles = await Role.find().sort({ createdAt: -1 });

    res.json(roles);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch roles",
      error: error.message,
    });
  }
};

/**
 * GET ROLE BY ID
 */
export const getRoleById = async (req: Request, res: Response) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json(role);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch role",
      error: error.message,
    });
  }
};

/**
 * UPDATE ROLE
 */
export const updateRole = async (req: Request, res: Response) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json(role);
  } catch (error: any) {
    res.status(400).json({
      message: "Failed to update role",
      error: error.message,
    });
  }
};

/**
 * DELETE ROLE
 */
export const deleteRole = async (req: Request, res: Response) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json({ message: "Role deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete role",
      error: error.message,
    });
  }
};
