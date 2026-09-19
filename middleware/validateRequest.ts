import ApiError from "../utils/ApiError";

// schema: a zod object shaped like { body?, params?, query? }.
// Only the parts present on the schema are validated/replaced.
export const validate = (schema) => (req, res, next) => {
  const toValidate = {};
  if (schema.shape.body) toValidate.body = req.body;
  if (schema.shape.params) toValidate.params = req.params;
  if (schema.shape.query) toValidate.query = req.query;

  const result = schema.safeParse(toValidate);
  if (!result.success) {
    return next(new ApiError(400, "Validation failed", result.error.flatten().fieldErrors));
  }

  if (result.data.body) req.body = result.data.body;
  if (result.data.query) req.query = result.data.query;
  next();
};
