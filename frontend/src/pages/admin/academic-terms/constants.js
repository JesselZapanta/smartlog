import { formatDate, fromYMD, toYMD } from "@/lib/dates";

export { formatDate, fromYMD, toYMD };

export const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const statusLabel = Object.fromEntries(statusOptions.map((option) => [option.value, option.label]));

export const statusTone = {
  active: "bg-green-50 text-green-700 ring-green-200",
  inactive: "bg-gray-100 text-gray-600 ring-gray-200",
};

export function formatPeriod(startAt, endAt) {
  return `${formatDate(startAt)} – ${formatDate(endAt)}`;
}
