import { Card } from "@/components/ui/card";

const tones = {
  green: "bg-green-50 text-green-700 ring-green-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  red: "bg-red-50 text-red-700 ring-red-100",
};

export default function StatCard({ label, value, helper, icon, tone = "green" }) {
  return (
    <Card className="h-full rounded-2xl border-gray-200 shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
            {label}
          </p>
          <p className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">{value ?? 0}</p>
          {helper ? <p className="mt-2 text-sm text-gray-500">{helper}</p> : null}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.green}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
