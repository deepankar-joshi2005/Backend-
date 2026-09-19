/** @format */

import { Router } from "express";
import {
  addSalaryStructure,
  getAllSalaryStructures,
  getSalaryStructureById,
  updateSalaryStructure,
  deleteSalaryStructureById,
} from "../../controllers/hrms/salaryStructureController";
import { authMiddleware } from "../../middleware/auth";

const SalaryStructureRouter = Router();

SalaryStructureRouter.use(authMiddleware);

SalaryStructureRouter.post("/", addSalaryStructure);
SalaryStructureRouter.get("/", getAllSalaryStructures);
SalaryStructureRouter.get("/:id", getSalaryStructureById);
SalaryStructureRouter.put("/:id", updateSalaryStructure);
SalaryStructureRouter.delete("/:id", deleteSalaryStructureById);

export default SalaryStructureRouter;
