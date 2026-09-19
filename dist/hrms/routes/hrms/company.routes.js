"use strict";
/** @format */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const companyController_1 = require("../../controllers/hrms/companyController");
const auth_1 = require("../../middleware/auth");
const companyLogoUpload_1 = require("../../utils/companyLogoUpload");
const companyStampUpload_1 = require("../../utils/companyStampUpload");
const CompanyRouter = express_1.default.Router();
CompanyRouter.use(auth_1.authMiddleware);
CompanyRouter.post("/", companyLogoUpload_1.companyLogoUpload.single("logo"), companyController_1.createCompany);
CompanyRouter.get("/", companyController_1.getAllCompanies);
CompanyRouter.get("/:id", companyController_1.getCompanyById);
CompanyRouter.put("/:id", companyLogoUpload_1.companyLogoUpload.single("logo"), companyController_1.updateCompany);
CompanyRouter.put("/:id/logo", companyLogoUpload_1.companyLogoUpload.single("logo"), companyController_1.uploadCompanyLogo);
CompanyRouter.put("/:id/stamp", companyStampUpload_1.companyStampUpload.single("stamp"), companyController_1.uploadCompanyStamp);
CompanyRouter.delete("/:id", companyController_1.deleteCompany);
exports.default = CompanyRouter;
