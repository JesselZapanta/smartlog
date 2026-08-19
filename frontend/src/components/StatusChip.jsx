const tones = {
  verified: "bg-green-50 text-green-700 ring-green-100",
  approved: "bg-green-50 text-green-700 ring-green-100",
  ongoing: "bg-green-50 text-green-700 ring-green-100",
  pending: "bg-amber-50 text-amber-700 ring-amber-100",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  expired: "bg-red-50 text-red-700 ring-red-100",
  rejected: "bg-red-50 text-red-700 ring-red-100",
  terminated: "bg-red-50 text-red-700 ring-red-100",
  completed: "bg-blue-50 text-blue-700 ring-blue-100",
  hours_completed: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  inactive: "bg-gray-100 text-gray-600 ring-gray-200",
};

const labels = {
  verified: "Verified",
  approved: "Approved",
  ongoing: "Deployed",
  pending: "Pending",
  active: "Active",
  expired: "Expired",
  rejected: "Rejected",
  terminated: "Terminated",
  completed: "Completed",
  hours_completed: "Hours completed",
  inactive: "Inactive",
};

export default function StatusChip({ status, label }) {
  const key = status || "inactive";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
        tones[key] || tones.inactive
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label || labels[key] || status}
    </span>
  );
}
