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
    <section className="rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 via-emerald-50 to-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="mb-1 text-sm font-medium text-green-600">{greeting}</p>
          <h1 className="font-heading mb-2 text-2xl font-bold text-green-950 sm:text-3xl">
            Welcome back, {user?.firstname || "there"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 font-mono text-xs font-semibold text-green-700">
              {roleLabel}
            </span>
            <span className="text-gray-500">{date}</span>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-green-100 backdrop-blur sm:px-5">
          <div className="font-heading text-3xl font-bold text-green-900 sm:text-4xl">{time}</div>
          <p className="mt-1 text-xs text-gray-500">Current time</p>
        </div>
      </div>
    </section>
  );
}
