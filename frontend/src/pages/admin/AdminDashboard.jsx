import { useCallback, useEffect, useState } from "react";
import {
  Store,
  GraduationCap,
  ShieldAlert,
  Loader2,
  Clock3,
  AlertTriangle,
  CalendarCheck,
} from "lucide-react";
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import StatCard from "@/components/StatCard.jsx";
import SectionCard from "@/components/SectionCard.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { useAuth } from "@/contexts/AuthContext";
import { useClock } from "@/hooks/useClock";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  fontSize: 12,
};

function ChartCard({ title, subtitle, children }) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      {children}
    </SectionCard>
  );
}

function DonutChart({ data, colors }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return (
    <div>
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              strokeWidth={0}
            >
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

export default function AdminDashboard() {
  const { user } = useAuth();
  const now = useClock();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [filters, setFilters] = useState({ academicYearId: "", days: "30" });
  const [termsLoading, setTermsLoading] = useState(true);

  useEffect(() => {
    api
      .get("/academic-terms/options")
      .then((res) => {
        const list = res.data.data || [];
        setAcademicYears(list);
        const active = list.find((term) => term.status === "active");
        if (active) {
          setFilters((prev) => ({ ...prev, academicYearId: String(active.id) }));
        }
      })
      .catch(() => {})
      .finally(() => setTermsLoading(false));
  }, []);

  const loadDashboard = useCallback(() => {
    if (termsLoading) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (filters.academicYearId) params.set("academic_year_id", filters.academicYearId);
    params.set("days", filters.days);
    api
      .get(`/dashboard?${params.toString()}`)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [filters, termsLoading]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <AdminLayout>
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
                ADMIN
              </span>
              <span className="text-sm text-green-100">{date}</span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-green-100 sm:text-[15px]">
              Here&apos;s what&apos;s happening across the OJT program today &mdash; monitor interns, verify records, and keep requirements on track.
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/20 px-5 py-3 text-center backdrop-blur sm:px-6 sm:py-4">
            <div className="font-heading text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">{time}</div>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-green-100">Current time</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={filters.academicYearId}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, academicYearId: value }))}
          disabled={termsLoading}
        >
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-[240px]">
            <SelectValue placeholder={termsLoading ? "Loading years\u2026" : "Academic Year"} />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((term) => (
              <SelectItem key={term.id} value={String(term.id)}>
                {term.description || term.code}
                {term.status === "active" ? " \u00B7 Active" : ""}
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
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <StatCard
              label="Total Interns"
              value={data.filtered_interns_total ?? data.stats.interns}
              helper={`${data.approved_interns} approved`}
              icon={<GraduationCap size={20} />}
              tone="green"
            />
            <StatCard
              label="Pending Registrations"
              value={data.pending_registrations}
              helper={`${data.rejected_interns} rejected`}
              icon={<Clock3 size={20} />}
              tone="amber"
            />
            <StatCard
              label="HTE Partners"
              value={data.stats.htes}
              helper={`${data.stats.ojt_coordinators} coordinators`}
              icon={<Store size={20} />}
              tone="emerald"
            />
            <StatCard
              label="Pending DTR Reviews"
              value={data.pending_dtr_reviews}
              helper={`${data.dtr_status_breakdown.find((d) => d.status === "checked")?.count ?? 0} checked`}
              icon={<CalendarCheck size={20} />}
              tone="blue"
            />
            <StatCard
              label="Unresolved Issues"
              value={data.issues.pending}
              helper={`${data.issues.resolved} resolved`}
              icon={<AlertTriangle size={20} />}
              tone="red"
            />
            <StatCard
              label="Unverified Emails"
              value={data.stats.unverified_users}
              helper="Awaiting OTP verification"
              icon={<ShieldAlert size={20} />}
              tone="amber"
            />
          </section>

          <SectionCard
            title="Attendance & Journal Activity"
            subtitle={`Photo DTR submissions and daily journals over the last ${data.filters?.days ?? filters.days} days`}
          >
            <div className="h-64 w-full sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.attendance_trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dtrFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="journalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="dtr" name="Photo DTR" stroke="#16a34a" strokeWidth={2} fill="url(#dtrFill)" />
                  <Area type="monotone" dataKey="journals" name="Journals" stroke="#0d9488" strokeWidth={2} fill="url(#journalFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-600">
                <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Photo DTR submissions
              </span>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-600">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> Daily journals
              </span>
            </div>
          </SectionCard>

          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <ChartCard title="Registration Status" subtitle="All intern records">
              <DonutChart data={data.intern_status_breakdown} colors={["#f59e0b", "#16a34a", "#ef4444"]} />
            </ChartCard>

            <ChartCard title="Interns by Institute" subtitle="Where interns are deployed per institute">
              {data.interns_by_institute.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">No institutes yet.</p>
              ) : (
                <div
                  className="w-full"
                  style={{ height: Math.max(200, data.interns_by_institute.length * 46) }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.interns_by_institute.map((item) => {
                        const acronym = item.name.match(/\(([^)]+)\)/);
                        return {
                          ...item,
                          shortName: acronym ? acronym[1] : item.name.replace(/^Institute of\s+/i, ""),
                        };
                      })}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="shortName"
                        width={64}
                        tick={{ fontSize: 11, fill: "#374151", fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                      />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(22,163,74,0.06)" }} />
                      <Bar dataKey="count" name="Interns" fill="#16a34a" radius={[0, 8, 8, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Accounts by Role" subtitle="User distribution across the system">
              <DonutChart
                data={data.role_breakdown}
                colors={["#16a34a", "#0d9488", "#6366f1", "#f59e0b", "#64748b"]}
              />
            </ChartCard>
          </section>

          <ChartCard title="Top Programs" subtitle="All programs ranked by intern count">
            {data.top_programs.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">No programs yet.</p>
            ) : (
              (() => {
                const half = Math.ceil(data.top_programs.length / 2);
                const columns = [
                  data.top_programs.slice(0, half),
                  data.top_programs.slice(half),
                ];
                const maxCount = Math.max(...data.top_programs.map((p) => p.count), 1);

                return (
                  <div className="space-y-5 sm:grid sm:grid-cols-2 sm:gap-x-10 sm:gap-y-0">
                    {columns.map((column, columnIndex) => (
                      <div key={columnIndex} className="space-y-2.5">
                        {column.map((program, index) => {
                          const rank = columnIndex * half + index + 1;
                          return (
                            <div key={program.name} className="flex items-center gap-3">
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                                  rank === 1
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-100 text-gray-500 ring-1 ring-gray-200"
                                }`}
                              >
                                {rank}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-xs font-semibold text-gray-700">{program.name}</p>
                                  <span className="shrink-0 font-mono text-xs font-bold text-gray-800">
                                    {program.count}
                                  </span>
                                </div>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                  <div
                                    className="h-full rounded-full bg-teal-600"
                                    style={{ width: `${(program.count / maxCount) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                         })}
                       </div>
                     ))}
                    </div>
                  );
                })()
              )}
            </ChartCard>

            <SectionCard title="Requirement Submissions" subtitle="Coordinator-reviewed documents across all institutes">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              {[
                { label: "Total submissions", value: data.requirement_submissions.total, tone: "text-gray-900", bar: "bg-gray-400", pct: 100 },
                { label: "Approved", value: data.requirement_submissions.approved, tone: "text-green-700", bar: "bg-green-500", pct: data.requirement_submissions.total ? (data.requirement_submissions.approved / data.requirement_submissions.total) * 100 : 0 },
                { label: "Pending review", value: data.requirement_submissions.pending, tone: "text-amber-700", bar: "bg-amber-500", pct: data.requirement_submissions.total ? (data.requirement_submissions.pending / data.requirement_submissions.total) * 100 : 0 },
                { label: "Rejected", value: data.requirement_submissions.rejected, tone: "text-red-700", bar: "bg-red-500", pct: data.requirement_submissions.total ? (data.requirement_submissions.rejected / data.requirement_submissions.total) * 100 : 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{item.label}</p>
                  <p className={`mt-1.5 font-heading text-2xl font-bold ${item.tone}`}>{item.value.toLocaleString()}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${Math.min(item.pct, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Evaluations so far: {data.evaluations.intern_ratings + data.evaluations.hte_ratings} rating entries &middot;{" "}
              {data.evaluations.interns_evaluated_by_hte} intern{data.evaluations.interns_evaluated_by_hte === 1 ? "" : "s"} evaluated by HTEs.
            </p>
          </SectionCard>
        </>
      )}
    </AdminLayout>
  );
}
