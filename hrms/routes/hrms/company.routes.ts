/** @format */

import express from "express";
import {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  uploadCompanyLogo,
  uploadCompanyStamp,
} from "../../controllers/hrms/companyController";
import { authMiddleware } from "../../middleware/auth";
import { companyLogoUpload } from "../../utils/companyLogoUpload";
import { companyStampUpload } from "../../utils/companyStampUpload";

const CompanyRouter = express.Router();

CompanyRouter.use(authMiddleware);

CompanyRouter.post("/", companyLogoUpload.single("logo"), createCompany);
CompanyRouter.get("/", getAllCompanies);
CompanyRouter.get("/:id", getCompanyById);
CompanyRouter.put("/:id", companyLogoUpload.single("logo"), updateCompany);
CompanyRouter.put("/:id/logo", companyLogoUpload.single("logo"), uploadCompanyLogo);
CompanyRouter.put("/:id/stamp", companyStampUpload.single("stamp"), uploadCompanyStamp);
CompanyRouter.delete("/:id", deleteCompany);

export default CompanyRouter;