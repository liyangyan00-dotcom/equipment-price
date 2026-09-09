// Unknown is distinct from a measured zero, including in JSON metadata.
export function materialOptionalNumber(value: unknown, max = Number.POSITIVE_INFINITY): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : null;
}
