export function normalizePhInput(value) {
  return String(value || "").replace(/[\s\-\(\)]/g, "");
}

export function isValidPhMobile(value) {
  if (!value) return false;
  const normalized = normalizePhInput(value);
  return /^(\+63|63|0)9\d{9}$/.test(normalized);
}

export const phMobileMessage = "Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX)";

export const phMobileOptionalSchema = (z) =>
  z
    .string()
    .optional()
    .refine((v) => !v || isValidPhMobile(v), { message: phMobileMessage });

export const phMobileRequiredSchema = (z) =>
  z.string().min(1, "This field is required").refine((v) => isValidPhMobile(v), { message: phMobileMessage });
