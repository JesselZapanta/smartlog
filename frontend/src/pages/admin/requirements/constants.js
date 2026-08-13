export const typeOptions = [
  { value: "pre_deployment", label: "Pre-Deployment" },
  { value: "post_deployment", label: "Post-Deployment" },
];

export const typeLabel = Object.fromEntries(typeOptions.map((option) => [option.value, option.label]));

export const typeTone = {
  pre_deployment: "bg-sky-50 text-sky-700 ring-sky-200",
  post_deployment: "bg-violet-50 text-violet-700 ring-violet-200",
};

export const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const statusLabel = Object.fromEntries(statusOptions.map((option) => [option.value, option.label]));

export const statusTone = {
  active: "bg-green-50 text-green-700 ring-green-200",
  inactive: "bg-gray-100 text-gray-600 ring-gray-200",
};

export function toActiveValue(isActive) {
  return isActive ? "active" : "inactive";
}
