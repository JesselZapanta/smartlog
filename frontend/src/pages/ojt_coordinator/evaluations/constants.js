export const categoryOptions = [
  { value: "personal_characteristics", label: "Personal Characteristics" },
  { value: "work_characteristics", label: "Work Characteristics" },
  { value: "job_knowledge", label: "Job Knowledge" },
];

export const categoryLabel = Object.fromEntries(categoryOptions.map((option) => [option.value, option.label]));

export const categoryTone = {
  personal_characteristics: "bg-blue-50 text-blue-700 ring-blue-200",
  work_characteristics: "bg-amber-50 text-amber-700 ring-amber-200",
  job_knowledge: "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

export const typeOptions = [
  { value: "intern", label: "Intern" },
  { value: "hte", label: "HTE" },
];

export const typeLabel = Object.fromEntries(typeOptions.map((option) => [option.value, option.label]));

export const typeTone = {
  intern: "bg-green-50 text-green-700 ring-green-200",
  hte: "bg-teal-50 text-teal-700 ring-teal-200",
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
