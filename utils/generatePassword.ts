import crypto from "crypto";

// Generates a readable temporary password, e.g. "Kf3-Tqz8-Rn2p".
export function generateTempPassword() {
  const chunk = () => crypto.randomBytes(3).toString("hex");
  return `${chunk()}-${chunk()}-${chunk()}`;
}
