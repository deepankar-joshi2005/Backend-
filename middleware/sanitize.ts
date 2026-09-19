// Strips Mongo operator keys ($gt, $where, ...) and dotted-path keys from
// user input, mutating objects in place. Express 5's req.query/req.params
// are getter-only, so this must never reassign them (only their contents).
function stripDangerousKeys(value) {
  if (Array.isArray(value)) {
    value.forEach(stripDangerousKeys);
    return;
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete value[key];
        continue;
      }
      stripDangerousKeys(value[key]);
    }
  }
}

export function sanitizeInputs(req, res, next) {
  if (req.body) stripDangerousKeys(req.body);
  if (req.params) stripDangerousKeys(req.params);
  if (req.query) stripDangerousKeys(req.query);
  next();
}
