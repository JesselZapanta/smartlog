const CONFIG = {
  requested: { label: "Requested", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  accepted: { label: "Accepted", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  evaluated: { label: "Ready to reassign", className: "bg-violet-50 text-violet-700 ring-violet-200" },
  reassigned: { label: "Reassigned", className: "bg-green-50 text-green-700 ring-green-200" },
};

export default function TransferStatusChip({ status, className = "" }) {
  const config = CONFIG[status] || {
    label: status || "Unknown",
    className: "bg-gray-100 text-gray-600 ring-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${config.className} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
