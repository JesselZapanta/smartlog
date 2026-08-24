import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  CalendarCheck,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import InstructorLayout from "@/layouts/InstructorLayout.jsx";
import StatCard from "@/components/StatCard.jsx";
import SectionCard from "@/components/SectionCard.jsx";
import StatusChip from "@/components/StatusChip.jsx";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useClock } from "@/hooks/useClock";
import { firstErrorMessage } from "@/lib/errors";

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  fontSize: 12,
};

function DonutChart({ data, colors }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) {
    return <p className="py-10 text-center text-sm text-gray-400">No data yet.</p>;
  }
  return (
    <div>
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={56} outerRadius={80} paddingAngle={3} strokeWidth={0}>
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-heading text-2xl font-bold text-gray-900">{total.toLocaleString()}</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Total</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {data.map((item, index) => (
          <span key={item.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            {item.label}
            <span className="font-mono font-semibold text-gray-800">{item.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const now = useClock();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [termsLoading, setTermsLoading] = useState(true);
  const [filters, setFilters] = useState({ academicYearId: "" });

  useEffect(() => {
    api
      .get("/academic-terms/options")
      .then((res) => {
        const list = res.data.data || [];
        setAcademicYears(list);
        const active = list.find((term) => term.status === "active");
        if (active) setFilters((prev) => ({ ...prev, academicYearId: String(active.id) }));
      })
      .catch(() => {})
      .finally(() => setTermsLoading(false));
  }, []);

  const load = useCallback(() => {
    if (termsLoading) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (filters.academicYearId) params.set("academic_year_id", filters.academicYearId);
    const qs = params.toString();
    api
      .get(`/dashboard${qs ? `?${qs}` : ""}`)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [filters, termsLoading]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <InstructorLayout>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-500 px-5 py-5 shadow-sm sm:px-8 sm:py-6">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-green-100">{greeting}</p>
            <h1 className="mt-1 font-heading text-xl font-bold tracking-tight text-white sm:text-2xl">
              Welcome back, {user?.firstname || "there"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 font-mono text-xs font-bold tracking-widest text-green-700 shadow-sm">
                INSTRUCTOR
              </span>
              <span className="text-sm text-green-100">{date}</span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-green-100 sm:text-[15px]">
              Monitor your deployed interns, review DTR submissions, and track daily journal activity.
            </p>
          </div>
          <div className="hidden shrink-0 rounded-xl bg-white/20 px-5 py-3 text-center backdrop-blur sm:block sm:px-6 sm:py-4">
            <div className="font-heading text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">{time}</div>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-green-100">Current time</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={filters.academicYearId}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, academicYearId: value }))}
          disabled={termsLoading}
        >
          <SelectTrigger className="h-11 w-full rounded-xl bg-white sm:w-[240px]">
            <SelectValue placeholder={termsLoading ? "Loading years…" : "Academic Year"} />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((term) => (
              <SelectItem key={term.id} value={String(term.id)}>
                {term.description || term.code}
                {term.status === "active" ? " · Active" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-600">{error}</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-2">
            <StatCard
              label="My Interns"
              value={data.filtered_interns_total ?? data.stats.interns}
              helper={`${data.approved_interns} approved`}
              icon={<GraduationCap size={20} />}
              tone="green"
            />
            <StatCard
              label="Pending DTR Reviews"
              value={data.pending_dtr_reviews}
              helper={`${data.dtr_status_breakdown?.find((d) => d.status === "checked")?.count ?? 0} checked`}
              icon={<CalendarCheck size={20} />}
              tone="blue"
            />
          </section>

          <SectionCard
            title="Attendance & Journal Activity"
            subtitle="Photo DTR submissions and daily journals"
          >
            <div className="h-64 w-full sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.attendance_trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="instructorDtrFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="instructorJournalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="dtr" name="Photo DTR" stroke="#16a34a" strokeWidth={2} fill="url(#instructorDtrFill)" dot={false} />
                  <Area type="monotone" dataKey="journals" name="Journals" stroke="#0d9488" strokeWidth={2} fill="url(#instructorJournalFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-x-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 sm:gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Photo DTR
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 sm:gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> Journals
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-gray-400">
                <CalendarCheck size={12} /> Recent activity
              </span>
            </div>
          </SectionCard>

          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            <SectionCard
              title="DTR Review Status"
              subtitle="Photo DTR submissions breakdown"
              action={<CalendarCheck size={18} className="text-gray-300" />}
            >
              <DonutChart
                data={data.dtr_status_breakdown.filter((d) => d.count > 0)}
                colors={["#f59e0b", "#16a34a", "#0d9488", "#ef4444", "#6366f1"]}
              />
              <p className="mt-3 text-center text-xs text-gray-400">
                Pending:{" "}
                <span className="font-mono font-semibold text-amber-700">
                  {data.dtr_status_breakdown.find((d) => d.status === "pending")?.count ?? 0}
                </span>{" "}
                · Checked:{" "}
                <span className="font-mono font-semibold text-green-700">
                  {data.dtr_status_breakdown.find((d) => d.status === "checked")?.count ?? 0}
                </span>
              </p>
            </SectionCard>

            <SectionCard
              title="OJT Deployment"
              subtitle="Intern deployment progress"
              action={<GraduationCap size={18} className="text-gray-300" />}
            >
              <DonutChart
                data={data.ojt_status_breakdown.filter((d) => d.count > 0)}
                colors={["#f59e0b", "#16a34a", "#6366f1", "#0d9488"]}
              />
            </SectionCard>
          </section>

          <SectionCard
            title="Recent Interns"
            subtitle="Latest registrations and verification status"
            action={<GraduationCap size={18} className="text-gray-300" />}
          >
            {data.recent_interns.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No interns yet.</p>
            ) : (
              <>
                <div className="space-y-3 sm:hidden">
                  {data.recent_interns.map((intern) => (
                    <div key={intern.uuid} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-[10px] font-bold text-white">
                            {getInitials(intern.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-800">{intern.full_name}</p>
                          <p className="truncate text-xs text-gray-400">{intern.program || "—"}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusChip status={intern.status || (intern.email_verified_at ? "approved" : "pending")} />
                        <span className="ml-auto rounded bg-green-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-green-700 ring-1 ring-green-100">
                          {intern.created_at ? new Date(intern.created_at).toLocaleDateString("en-US") : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                        <th className="pb-3 pr-3 font-semibold">Intern</th>
                        <th className="pb-3 pr-3 font-semibold">Program</th>
                        <th className="pb-3 pr-3 font-semibold">Status</th>
                        <th className="pb-3 text-right font-semibold">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_interns.map((intern) => (
                        <tr key={intern.uuid} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-[10px] font-bold text-white">
                                  {getInitials(intern.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-800">{intern.full_name}</p>
                                <p className="truncate text-xs text-gray-400">{intern.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-3 text-xs text-gray-600">{intern.program || "—"}</td>
                          <td className="py-3 pr-3">
                            <StatusChip status={intern.status || (intern.email_verified_at ? "approved" : "pending")} />
                          </td>
                          <td className="py-3 text-right">
                            <span className="rounded bg-green-50 px-2 py-0.5 font-mono text-xs font-semibold text-green-700 ring-1 ring-green-100">
                              {intern.created_at ? new Date(intern.created_at).toLocaleDateString("en-US") : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="pt-3">
              <Button asChild variant="outline" size="sm" className="h-8 w-full rounded-xl text-xs sm:w-auto">
                <Link to="/instructor/interns" className="gap-1.5">
                  View all interns <ArrowRight size={12} />
                </Link>
              </Button>
            </div>
          </SectionCard>
        </>
      )}
    </InstructorLayout>
  );
}
