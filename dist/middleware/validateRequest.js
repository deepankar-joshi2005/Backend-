"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const ApiError_1 = __importDefault(require("../utils/ApiError"));
// schema: a zod object shaped like { body?, params?, query? }.
// Only the parts present on the schema are validated/replaced.
const validate = (schema) => (req, res, next) => {
    const toValidate = {};
    if (schema.shape.body)
        toValidate.body = req.body;
    if (schema.shape.params)
        toValidate.params = req.params;
    if (schema.shape.query)
        toValidate.query = req.query;
    const result = schema.safeParse(toValidate);
    if (!result.success) {
        return next(new ApiError_1.default(400, "Validation failed", result.error.flatten().fieldErrors));
    }
    if (result.data.body)
        req.body = result.data.body;
    if (result.data.query)
        req.query = result.data.query;
    next();
};
exports.validate = validate;
