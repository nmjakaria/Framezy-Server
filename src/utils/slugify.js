const RESERVED_SLUGS = new Set([
  "", "api", "admin", "dashboard", "designer", "sign-in", "sign-up",
  "frames", "mine", "all", "slug", "health", "f",
]);

export function slugify(input) {
  return (input || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isValidCustomSlug(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 60) return false;
  if (!/^[a-z0-9-]+$/.test(trimmed)) return false;
  if (RESERVED_SLUGS.has(trimmed)) return false;
  return true;
}

// Generates a unique slug, retrying with -2, -3, etc. on collision.
// excludeId lets an update check uniqueness against every OTHER frame.
export async function generateUniqueSlug(Frame, { requestedSlug, name, excludeId } = {}) {
  let base = slugify(requestedSlug || name);
  if (!base || RESERVED_SLUGS.has(base)) base = "frame";

  let candidate = base;
  let suffix = 1;
  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await Frame.findOne(query).select("_id");
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}