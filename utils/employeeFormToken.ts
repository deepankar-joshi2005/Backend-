import jwt from "jsonwebtoken";

// Short-lived, purpose-scoped token proving a public visitor has just typed
// the correct Employee ID for one specific ClientEmployee of one Business
// Client. Deliberately separate from user login tokens (generateToken.ts) —
// this never represents an authenticated User, only "may update this one
// employee's own record for the next little while".
const EXPIRES_IN = "45m";

export function signEmployeeFormAccessToken(businessClientId: string, clientEmployeeId: string) {
  return jwt.sign({ businessClientId, clientEmployeeId, purpose: "employee_form" }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: EXPIRES_IN,
  });
}

export function verifyEmployeeFormAccessToken(token: string): { businessClientId: string; clientEmployeeId: string } {
  const payload: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  if (payload.purpose !== "employee_form" || !payload.businessClientId || !payload.clientEmployeeId) {
    throw new Error("Invalid form token");
  }
  return payload;
}
