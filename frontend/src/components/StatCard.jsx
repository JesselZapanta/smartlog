import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";

const tones = {
  green: {
    icon: "bg-green-50 text-green-600 ring-green-100",
    accent: "bg-green-500",
    pill: "bg-green-50 text-green-700 ring-green-200",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    accent: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 ring-amber-100",
    accent: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  blue: {
    icon: "bg-blue-50 text-blue-600 ring-blue-100",
    accent: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  red: {
    icon: "bg-red-50 text-red-600 ring-red-100",
    accent: "bg-red-500",
    pill: "bg-red-50 text-red-700 ring-red-200",
  },
};

export default function StatCard({ label, value, helper, icon, tone = "green", trend }) {
  const t = tones[tone] || tones.green;

  return (
    <Card className="relative h-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`absolute left-0 top-0 h-full w-1 ${t.accent}`} />
      <div className="relative p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
            {label}
          </p>
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${t.icon}`}>
            {icon}
          </div>
        </div>
        <p className="mt-1.5 font-heading text-xl font-bold tracking-tight text-gray-900">
          {(value ?? 0).toLocaleString()}
        </p>
        {helper ? (
          <span className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${t.pill}`}>
            {helper}
          </span>
        ) : null}
        {trend && (
          <span
            className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${
              trend.direction === "up"
                ? "text-green-600"
                : trend.direction === "down"
                  ? "text-red-600"
                  : "text-gray-400"
            }`}
          >
            {trend.direction === "up" ? (
              <TrendingUp size={12} />
            ) : trend.direction === "down" ? (
              <TrendingDown size={12} />
            ) : (
              <Minus size={12} />
            )}
            {trend.percent != null ? `${trend.direction === "down" ? "-" : trend.direction === "up" ? "+" : ""}${Math.abs(Number(trend.percent)).toFixed(1)}%` : "—"}
          </span>
        )}
      </div>
    </Card>
  );
}
