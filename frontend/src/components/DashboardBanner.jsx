import { Clock3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useClock } from "@/hooks/useClock";

export default function DashboardBanner({ roleLabel, subtitle }) {
  const { user } = useAuth();
  const now = useClock();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <section className="relative overflow-hidden rounded-3xl border border-green-100 bg-gradient-to-br from-white via-green-50/60 to-emerald-50 p-6 shadow-sm sm:p-7">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-green-100/50" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-emerald-100/40" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-wide text-green-600">{greeting}</p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-green-900 sm:text-3xl">
            Welcome back, {user?.firstname || "there"}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-green-600 px-3 py-1 font-mono text-xs font-bold tracking-widest text-white shadow-sm">
              {roleLabel}
            </span>
            <span className="text-sm text-gray-500">{date}</span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-[15px]">{subtitle}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-green-100 bg-white px-6 py-4 shadow-sm sm:px-7 sm:py-5">
          <div className="font-heading text-3xl font-bold tracking-tight text-green-900 tabular-nums sm:text-4xl">{time}</div>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            <Clock3 size={12} className="text-green-600" /> Current time
          </p>
        </div>
      </div>
    </section>
  );
}
