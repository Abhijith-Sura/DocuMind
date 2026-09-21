/**
 * Safely extracts a human-readable error string from an axios error.
 * Handles:
 *   - Plain string detail: "Invalid credentials"
 *   - Pydantic 422 array: [{type, loc, msg, input}, ...]
 *   - FastAPI HTTPException detail object
 */
export function getApiError(err: any, fallback = "Something went wrong. Please try again."): string {
  const detail = err?.response?.data?.detail;

  if (!detail) return fallback;

  // Already a string — most common case
  if (typeof detail === "string") return detail;

  // Pydantic v2 validation errors: array of {type, loc, msg, input}
  if (Array.isArray(detail)) {
    return detail
      .map((e: any) => {
        const field = Array.isArray(e.loc) ? e.loc.filter((l: any) => l !== "body").join(" → ") : "";
        const msg = e.msg ?? "Validation error";
        return field ? `${field}: ${msg}` : msg;
      })
      .join(" | ");
  }

  // Object with a message key
  if (typeof detail === "object" && detail.message) return detail.message;

  // Last resort
  return fallback;
}
