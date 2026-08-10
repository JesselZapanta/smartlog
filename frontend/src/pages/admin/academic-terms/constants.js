export const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const statusLabel = Object.fromEntries(statusOptions.map((option) => [option.value, option.label]));

export const statusTone = {
  active: "bg-green-50 text-green-700 ring-green-200",
  inactive: "bg-gray-100 text-gray-600 ring-gray-200",
};

export function toYMD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromYMD(value) {
  if (!value) return null;
  const ymd = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatPeriod(startAt, endAt) {
  return `${formatDate(startAt)} – ${formatDate(endAt)}`;
}
