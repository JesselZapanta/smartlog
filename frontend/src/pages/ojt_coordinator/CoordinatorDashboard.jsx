import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  GraduationCap,
  Store,
  BookOpen,
  ShieldAlert,
  Building2,
  Check,
  Loader2,
  Clock3,
  AlertTriangle,
  UserCheck,
  FileText,
  CalendarCheck,
  Award,
  TrendingUp,
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
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
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

function ChartCard({ title, subtitle, children, action }) {
  return (
    <SectionCard title={title} subtitle={subtitle} action={action}>
      {children}
    </SectionCard>
  );
}

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

export default function CoordinatorDashboard() {
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
        if (active) {
          setFilters((prev) => ({ ...prev, academicYearId: String(active.id) }));
        }
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
    api
      .get(`/dashboard?${params.toString()}`)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [filters, termsLoading]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = data?.pending_approvals || [];

  return (
    <CoordinatorLayout>
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
                {data?.institute ? data.institute.name.toUpperCase() : "COORDINATOR"}
              </span>
              <span className="text-sm text-green-100">{date}</span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-green-100 sm:text-[15px]">
              {data?.institute
                ? `Manage intern registrations, deployments, and HTE partnerships for ${data.institute.name}. Keep requirements and issues on track.`
                : "Approve intern registrations for your institute and keep host training establishments on track."}
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
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <StatCard
              label="Total Interns"
              value={data.stats.interns}
              helper={`${data.stats.approved_interns} approved · ${data.stats.pending_registrations} pending`}
              icon={<GraduationCap size={20} />}
              tone="green"
            />
            <StatCard
              label="Pending Approvals"
              value={data.stats.pending_registrations}
              helper={`${data.stats.rejected_interns} rejected`}
              icon={<Clock3 size={20} />}
              tone="amber"
            />
            <StatCard
              label="Deployed Interns"
              value={data.stats.assigned_interns}
              helper={`${data.stats.unassigned_interns} unassigned`}
              icon={<UserCheck size={20} />}
              tone="blue"
            />
            <StatCard
              label="HTE Partners"
              value={data.stats.htes}
              helper={`${data.stats.htes_active} active · ${data.stats.programs} programs`}
              icon={<Building2 size={20} />}
              tone="emerald"
            />
            <StatCard
              label="Pending Requirements"
              value={data.requirement_submissions.pending}
              helper={`${data.requirement_submissions.approved} approved / ${data.requirement_submissions.total}`}
              icon={<FileText size={20} />}
              tone="amber"
            />
            <StatCard
              label="Unresolved Issues"
              value={data.issues.pending}
              helper={`${data.issues.resolved} resolved`}
              icon={<AlertTriangle size={20} />}
              tone="red"
            />
          </section>

          <SectionCard
            title="Attendance & Journal Activity"
            subtitle="Photo DTR submissions and daily journals — institute scoped"
          >
            <div className="h-64 w-full sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.attendance_trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="coordDtrFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="coordJournalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="dtr" name="Photo DTR" stroke="#16a34a" strokeWidth={2} fill="url(#coordDtrFill)" dot={false} />
                  <Area type="monotone" dataKey="journals" name="Journals" stroke="#0d9488" strokeWidth={2} fill="url(#coordJournalFill)" dot={false} />
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

          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <ChartCard title="Registration Status" subtitle="Pending · Approved · Rejected" action={<ShieldAlert size={18} className="text-gray-300" />}>
              <DonutChart data={data.intern_status_breakdown} colors={["#f59e0b", "#16a34a", "#ef4444"]} />
            </ChartCard>
            <ChartCard title="OJT Deployment" subtitle="Deployment progress across interns" action={<TrendingUp size={18} className="text-gray-300" />}>
              <DonutChart
                data={data.ojt_status_breakdown}
                colors={["#f59e0b", "#16a34a", "#6366f1", "#0d9488"]}
              />
            </ChartCard>
            <ChartCard title="Interns by Program" subtitle="Distribution in your institute" action={<BookOpen size={18} className="text-gray-300" />}>
              {data.interns_by_program.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">No programs deployed yet.</p>
              ) : (
                <div className="w-full" style={{ height: Math.max(200, data.interns_by_program.length * 42) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.interns_by_program} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 11, fill: "#374151", fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                      />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(22,163,74,0.06)" }} />
                      <Bar dataKey="count" name="Interns" fill="#16a34a" radius={[0, 8, 8, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </section>

          <SectionCard
            title="Requirement Submissions"
            subtitle="Coordinator-reviewed documents for your institute"
            action={<FileText size={18} className="text-gray-300" />}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total", value: data.requirement_submissions.total, tone: "text-gray-900", bar: "bg-gray-400", pct: 100 },
                {
                  label: "Approved",
                  value: data.requirement_submissions.approved,
                  tone: "text-green-700",
                  bar: "bg-green-500",
                  pct: data.requirement_submissions.total ? (data.requirement_submissions.approved / data.requirement_submissions.total) * 100 : 0,
                },
                {
                  label: "Pending review",
                  value: data.requirement_submissions.pending,
                  tone: "text-amber-700",
                  bar: "bg-amber-500",
                  pct: data.requirement_submissions.total ? (data.requirement_submissions.pending / data.requirement_submissions.total) * 100 : 0,
                },
                {
                  label: "Rejected",
                  value: data.requirement_submissions.rejected,
                  tone: "text-red-700",
                  bar: "bg-red-500",
                  pct: data.requirement_submissions.total ? (data.requirement_submissions.rejected / data.requirement_submissions.total) * 100 : 0,
                },
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
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1 ring-1 ring-gray-200">
                <Award size={12} className="text-green-600" /> {data.evaluations.intern_ratings + data.evaluations.hte_ratings} ratings
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-green-700 ring-1 ring-green-100">
                <Users size={12} /> {data.evaluations.interns_evaluated_by_hte} intern{data.evaluations.interns_evaluated_by_hte === 1 ? "" : "s"} evaluated
              </span>
            </div>
          </SectionCard>

          <SectionCard
            title="Pending Approvals"
            subtitle={pending.length > 0 ? `Interns waiting for your decision — ${pending.length} to view` : "No interns waiting for approval"}
            action={<ShieldAlert size={18} className="text-gray-300" />}
          >
            {pending.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600 ring-1 ring-green-100">
                  <Check size={20} />
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-700">All caught up!</p>
                <p className="mt-1 text-sm text-gray-400">New intern registrations for your institute will appear here.</p>
                <Button asChild variant="outline" className="mt-4 h-9 rounded-xl">
                  <Link to="/coordinator/registrations" className="gap-1.5">
                    View all registrations <ArrowRight size={14} />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((intern) => (
                  <div
                    key={intern.uuid}
                    className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                          {getInitials(intern.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{intern.full_name}</p>
                        <p className="truncate text-xs text-gray-400">{intern.email}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {intern.program || "—"}
                          {intern.created_at ? ` · Registered ${new Date(intern.created_at).toLocaleDateString("en-US")}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        asChild
                        variant="outline"
                        className="h-11 gap-1.5 rounded-xl border-green-200 font-semibold text-green-700 hover:bg-green-50 sm:flex-none"
                      >
                        <Link to="/coordinator/registrations" className="gap-1.5">
                          View <ArrowRight size={14} />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {pending.length >= 5 ? (
                  <div className="pt-2 text-center">
                    <Button asChild variant="ghost" size="sm" className="h-8 rounded-full text-xs text-green-700 hover:text-green-800">
                      <Link to="/coordinator/registrations" className="gap-1">
                        View all pending <ArrowRight size={12} />
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </SectionCard>

          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionCard
                title="Recent Interns"
                subtitle="Latest registrations in your institute"
                action={<GraduationCap size={18} className="text-gray-300" />}
              >
                {data.recent_interns.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">No interns yet for this academic year.</p>
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
                            <StatusChip status={intern.ojt_status || "pending"} />
                            <span className="ml-auto rounded bg-green-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-green-700 ring-1 ring-green-100">
                              {intern.created_at ? new Date(intern.created_at).toLocaleDateString("en-US") : "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden overflow-x-auto sm:block">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                            <th className="pb-3 pr-3 font-semibold">Intern</th>
                            <th className="pb-3 pr-3 font-semibold">Program</th>
                            <th className="pb-3 pr-3 font-semibold">Registration</th>
                            <th className="pb-3 pr-3 font-semibold">Deployment</th>
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
                              <td className="py-3 pr-3">
                                <StatusChip status={intern.ojt_status || "pending"} />
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
                    <Link to="/coordinator/interns" className="gap-1.5">
                      View all interns <ArrowRight size={12} />
                    </Link>
                  </Button>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="HTE Partnerships" subtitle="Host training establishments" action={<Building2 size={18} className="text-gray-300" />}>
              {data.htes.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No HTE records yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.htes.map((hte) => (
                    <div key={hte.uuid} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700 ring-1 ring-green-100">
                          <Store size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-700">{hte.name}</p>
                          <p className="truncate text-xs text-gray-400">
                            {hte.program || "—"}
                            {hte.assigned_count != null ? ` · ${hte.assigned_count} intern${hte.assigned_count === 1 ? "" : "s"}` : ""}
                          </p>
                        </div>
                      </div>
                      <StatusChip status={hte.status} />
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-3">
                <Button asChild variant="outline" size="sm" className="h-8 w-full rounded-xl text-xs">
                  <Link to="/coordinator/htes" className="gap-1.5">
                    Manage HTEs <ArrowRight size={12} />
                  </Link>
                </Button>
              </div>
            </SectionCard>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <ChartCard title="DTR Review Status" subtitle="Photo DTR across your interns" action={<CalendarCheck size={18} className="text-gray-300" />}>
              <DonutChart
                data={data.dtr_status_breakdown.filter((d) => d.count > 0)}
                colors={["#f59e0b", "#16a34a", "#0d9488", "#ef4444", "#6366f1"]}
              />
              <p className="mt-3 text-center text-xs text-gray-400">
                Pending DTR:{" "}
                <span className="font-mono font-semibold text-amber-700">
                  {data.dtr_status_breakdown.find((d) => d.status === "pending")?.count ?? 0}
                </span>{" "}
                · Checked:{" "}
                <span className="font-mono font-semibold text-green-700">
                  {data.dtr_status_breakdown.find((d) => d.status === "checked")?.count ?? 0}
                </span>
              </p>
            </ChartCard>

            <SectionCard
              title="Recent Issues"
              subtitle="Concerns needing your attention"
              action={<AlertTriangle size={18} className="text-gray-300" />}
            >
              {data.recent_issues.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No issues raised for this year.</p>
              ) : (
                <div className="space-y-3">
                  {data.recent_issues.map((issue) => (
                    <div key={issue.id} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 flex-1 text-sm font-medium leading-snug text-gray-700">{issue.excerpt}</p>
                        <StatusChip status={issue.status === "resolve" ? "completed" : "pending"} label={issue.status === "resolve" ? "Resolved" : "Pending"} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${issue.type === "hte" ? "bg-blue-50 text-blue-700 ring-blue-100" : "bg-green-50 text-green-700 ring-green-100"}`}
                        >
                          {issue.type === "hte" ? "HTE" : "Intern"}
                        </span>
                        <span className="truncate font-medium text-gray-600">{issue.raised_by}</span>
                        <span className="ml-auto font-mono text-xs text-gray-400">
                          {issue.created_at ? new Date(issue.created_at).toLocaleDateString("en-US") : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-3">
                <Button asChild variant="ghost" size="sm" className="h-8 w-full rounded-xl text-xs text-green-700 hover:text-green-800">
                  <Link to="/coordinator/issues" className="gap-1.5">
                    Manage issues <ArrowRight size={12} />
                  </Link>
                </Button>
              </div>
            </SectionCard>

            <SectionCard title="Top HTEs" subtitle="By deployed intern count" action={<Award size={18} className="text-gray-300" />}>
              {data.top_htes.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No HTE assignments yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.top_htes.map((hte, idx) => {
                    const max = Math.max(...data.top_htes.map((h) => h.count), 1);
                    return (
                      <div key={hte.name} className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                            idx === 0 ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500 ring-1 ring-gray-200"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-gray-700">{hte.name}</p>
                            <span className="shrink-0 font-mono text-xs font-bold text-gray-800">{hte.count}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(hte.count / max) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pt-3">
                <Button asChild variant="outline" size="sm" className="h-8 w-full rounded-xl text-xs">
                  <Link to="/coordinator/hte-assignments" className="gap-1.5">
                    View assignments <ArrowRight size={12} />
                  </Link>
                </Button>
              </div>
            </SectionCard>
      </section>
    </>
  )}
</CoordinatorLayout>
);
}
