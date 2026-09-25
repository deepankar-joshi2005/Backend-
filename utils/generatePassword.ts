import crypto from "crypto";

// Generates a readable temporary password, e.g. "Acme@4821" (seeded from the
// firm/client/staff name so it's easy to recognize) or "User@4821" when no
// name is available. The trailing 4-digit number is drawn fresh each call —
// enough entropy that back-to-back calls (even with the same seed) don't
// collide in practice.
export function generateTempPassword(seed?: string) {
  const letters = (seed || "").replace(/[^a-zA-Z]/g, "");
  const namePart = letters ? letters[0].toUpperCase() + letters.slice(1, 6).toLowerCase() : "User";
  const digits = crypto.randomInt(1000, 10000);
  return `${namePart}@${digits}`;
}
