export function firstErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  const errors = err?.response?.data?.errors;
  if (errors && typeof errors === "object") {
    const firstKey = Object.keys(errors)[0];
    const first = errors[firstKey];
    if (Array.isArray(first) && first.length > 0) return first[0];
    if (typeof first === "string") return first;
  }
  return err?.response?.data?.message || fallback;
}
