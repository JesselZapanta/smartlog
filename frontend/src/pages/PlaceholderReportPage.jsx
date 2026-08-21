import { Construction } from "lucide-react";

export default function PlaceholderReportPage({ title = "Report" }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
        <Construction size={28} />
      </div>
      <h1 className="mt-4 font-heading text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">To be implemented later</p>
    </div>
  );
}
