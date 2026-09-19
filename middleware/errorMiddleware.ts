export const notFound = (req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Server error";
  let errors = err.errors || null;

  if (err.name === "ValidationError") {
    // Mongoose schema validation error
    statusCode = 400;
    errors = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, [e.message]])
    );
    message = "Validation failed";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {}).join(", ");
    message = `${field || "Value"} already in use`;
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Invalid or expired token";
  } else if (err.name === "MulterError") {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 10MB)" : err.message;
  }

  if (statusCode >= 500) {
    console.error(err.stack || err);
  }

  res.status(statusCode).json({ success: false, message, ...(errors ? { errors } : {}) });
};
