import CaFirm from "../models/CaFirm";

function toSlug(text) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "firm"
  );
}

// Generates a unique slug for a CaFirm, appending a numeric suffix on collision.
export async function generateUniqueSlug(name) {
  const base = toSlug(name);
  let slug = base;
  let counter = 1;
  while (await CaFirm.exists({ slug })) {
    counter += 1;
    slug = `${base}-${counter}`;
  }
  return slug;
}
