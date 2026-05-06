/**
 * Safely format a date value for display.
 * Handles both Date objects (from superjson) and string values.
 */
export function formatDate(value: unknown): string {
  if (!value) return "-";
  if (value instanceof Date) {
    // Format as YYYY-MM-DD
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string") return value;
  return String(value);
}

/**
 * Safely format a date value for use in <input type="date"> value attribute.
 * Returns YYYY-MM-DD string.
 */
export function toDateInputValue(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string") return value;
  return "";
}
