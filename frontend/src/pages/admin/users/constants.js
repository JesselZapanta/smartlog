import { BadgeCheck, Building2, GraduationCap, UserCog } from "lucide-react";

export const roleOptions = [
  { value: "intern", label: "Intern" },
  { value: "ojt_instructor", label: "OJT Instructor" },
  { value: "ojt_coordinator", label: "OJT Coordinator" },
  { value: "hte", label: "HTE" },
  { value: "admin", label: "Admin" },
];

export const roleLabel = Object.fromEntries(roleOptions.map((role) => [role.value, role.label]));

export const roleTone = {
  admin: "bg-violet-50 text-violet-700 ring-violet-200",
  intern: "bg-green-50 text-green-700 ring-green-200",
  ojt_instructor: "bg-blue-50 text-blue-700 ring-blue-200",
  ojt_coordinator: "bg-amber-50 text-amber-700 ring-amber-200",
  hte: "bg-teal-50 text-teal-700 ring-teal-200",
};

export const roleStepConfig = {
  intern: {
    type: "intern",
    label: "Intern Details",
    icon: GraduationCap,
    fields: [
      "academic_year_id",
      "institute_id",
      "program_id",
      "date_of_birth",
      "place_of_birth",
      "fathers_name",
      "fathers_occupation",
      "fathers_contact",
      "mothers_name",
      "mothers_occupation",
      "mothers_contact",
      "parents_guardian_address",
      "practicum_instructor",
      "cor",
    ],
  },
  ojt_coordinator: {
    type: "coordinator",
    label: "Coordinator Details",
    icon: BadgeCheck,
    fields: ["institute_id", "program_id"],
  },
  ojt_instructor: {
    type: "coordinator",
    label: "Instructor Details",
    icon: UserCog,
    fields: ["institute_id", "program_id"],
  },
  hte: {
    type: "hte",
    label: "HTE Details",
    icon: Building2,
    fields: ["name", "institute_id", "program_id", "moa", "start_at", "end_at"],
  },
};

export function recordTypeFor(role) {
  return roleStepConfig[role]?.type || null;
}

export const roleStepAllFields = [...new Set(Object.values(roleStepConfig).flatMap((config) => config.fields))];

export function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
