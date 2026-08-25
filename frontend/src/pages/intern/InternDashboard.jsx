import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  NotebookPen,
  FolderUp,
  ClipboardCheck,
  Clock3,
  XCircle,
  ArrowRight,
  Building2,
  BookOpen,
  CalendarDays,
  UserRound,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InternLayout from "@/layouts/InternLayout.jsx";
import StatCard from "@/components/StatCard.jsx";
import SectionCard from "@/components/SectionCard.jsx";
import StatusChip from "@/components/StatusChip.jsx";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useClock } from "@/hooks/useClock";
import { firstErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/dates";

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const moduleCards = [
  { icon: Camera, title: "Photo DTR", description: "Time in/out with photo", tone: "bg-green-50 text-green-700", to: "/intern/photo-dtr" },
  { icon: NotebookPen, title: "Daily Journal", description: "Document daily tasks", tone: "bg-emerald-50 text-emerald-700", to: "/intern/journals" },
  { icon: FolderUp, title: "Requirements", description: "Submit documents", tone: "bg-teal-50 text-teal-700", to: "/intern/requirements" },
  { icon: ClipboardCheck, title: "Evaluate HTE", description: "Rate your host", tone: "bg-blue-50 text-blue-700", to: "/intern/evaluations" },
];

export default function InternDashboard() {
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
    <InternLayout>
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
                INTERN
              </span>
              <span className="text-sm text-green-100">{date}</span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-green-100 sm:text-[15px]">
              Track your hours, submit your journal, and stay on top of your OJT requirements.
            </p>
          </div>
          <div className="hidden shrink-0 rounded-xl bg-white/20 px-5 py-3 text-center backdrop-blur sm:block sm:px-6 sm:py-4">
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
          <SelectTrigger className="h-11 w-full rounded-xl bg-white sm:w-[240px]">
            <SelectValue placeholder={termsLoading ? "Loading years..." : "Academic Year"} />
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
          {data.intern?.status === "pending" && (
            <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:items-center sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Clock3 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-base font-bold text-amber-900">Registration under review</h2>
                <p className="mt-0.5 text-sm text-amber-700">
                  Your coordinator is reviewing your registration. You&apos;ll be able to use SMARTLOG once approved.
                </p>
              </div>
            </section>
          )}

          {data.intern?.status === "rejected" && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
              <div className="flex items-start gap-3 sm:items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <XCircle size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-base font-bold text-red-900">Registration rejected</h2>
                  <p className="mt-0.5 text-sm text-red-700">
                    Your registration was not approved. Review the reason and resubmit.
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-red-100">
                <p className="text-xs font-bold uppercase tracking-wide text-red-500">Reason</p>
                <p className="mt-1 text-sm text-gray-800">{data.intern.rejection_reason || "No reason provided."}</p>
              </div>
              <Button asChild className="mt-4 h-11 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700">
                <Link to="/intern/resubmit">
                  Resubmit Registration <ArrowRight size={16} />
                </Link>
              </Button>
            </section>
          )}

          {data.intern?.status === "approved" && (
            <>
              <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatCard
                  label="OJT Hours"
                  value={data.ojt_hours?.earned ?? 0}
                  helper={`of ${data.ojt_hours?.required ?? 0} required`}
                  icon={<TrendingUp size={20} />}
                  tone="green"
                />
                <StatCard
                  label="Requirements"
                  value={data.requirements?.approved ?? 0}
                  helper={`${data.requirements?.pending ?? 0} pending / ${data.requirements?.total ?? 0} total`}
                  icon={<FileText size={20} />}
                  tone="blue"
                />
                <StatCard
                  label="Journals"
                  value={data.recent_journals?.length ?? 0}
                  helper="Recent entries"
                  icon={<NotebookPen size={20} />}
                  tone="emerald"
                />
                <StatCard
                  label="Issues"
                  value={data.issues?.pending ?? 0}
                  helper={`${data.issues?.resolved ?? 0} resolved`}
                  icon={<AlertTriangle size={20} />}
                  tone={data.issues?.pending > 0 ? "red" : "green"}
                />
              </section>

              <SectionCard
                title="OJT Progress"
                subtitle={`${data.ojt_hours?.earned ?? 0} of ${data.ojt_hours?.required ?? 0} hours completed`}
              >
                <div className="relative h-4 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                    style={{ width: `${data.ojt_hours?.progress ?? 0}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span className="font-mono font-semibold text-green-700">{data.ojt_hours?.earned ?? 0}h earned</span>
                  <span className="font-mono">{data.ojt_hours?.remaining ?? 0}h remaining</span>
                </div>
              </SectionCard>

              <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {moduleCards.map(({ icon: Icon, title, description, tone, to }) => (
                  <Link
                    key={title}
                    to={to}
                    className="group flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${tone} ring-current/10`}>
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading text-sm font-bold text-gray-900 sm:text-base">{title}</h3>
                        <ArrowRight size={14} className="shrink-0 text-gray-300 transition group-hover:text-green-600" />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">{description}</p>
                    </div>
                  </Link>
                ))}
              </section>

              <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <SectionCard
                    title="Recent DTR"
                    subtitle="Your latest time-in/out entries"
                    action={<Camera size={18} className="text-gray-300" />}
                  >
                    {data.recent_dtr?.length === 0 ? (
                      <div className="py-8 text-center">
                        <Camera size={28} className="mx-auto text-gray-300" />
                        <p className="mt-2 text-sm text-gray-400">No DTR entries yet.</p>
                        <Button asChild variant="outline" className="mt-3 h-9 rounded-xl">
                          <Link to="/intern/photo-dtr" className="gap-1.5">
                            Submit DTR <ArrowRight size={14} />
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 sm:hidden">
                          {data.recent_dtr.map((dtr) => (
                            <div key={dtr.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-800">{formatDate(dtr.date)}</span>
                                <StatusChip status={dtr.status} />
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                                <div className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-gray-100">
                                  <span className="text-[10px] font-medium uppercase text-gray-400">AM</span>
                                  <div className="flex items-center gap-2 font-mono text-gray-700">
                                    <span>{dtr.am_in || "—"}</span>
                                    <span className="text-gray-300">→</span>
                                    <span>{dtr.am_out || "—"}</span>
                                  </div>
                                </div>
                                <div className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-gray-100">
                                  <span className="text-[10px] font-medium uppercase text-gray-400">PM</span>
                                  <div className="flex items-center gap-2 font-mono text-gray-700">
                                    <span>{dtr.pm_in || "—"}</span>
                                    <span className="text-gray-300">→</span>
                                    <span>{dtr.pm_out || "—"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="hidden overflow-x-auto sm:block">
                          <table className="w-full min-w-[600px] text-left text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                                <th className="pb-3 pr-3 font-semibold">Date</th>
                                <th className="pb-3 pr-3 font-semibold">AM In</th>
                                <th className="pb-3 pr-3 font-semibold">AM Out</th>
                                <th className="pb-3 pr-3 font-semibold">PM In</th>
                                <th className="pb-3 pr-3 font-semibold">PM Out</th>
                                <th className="pb-3 text-right font-semibold">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.recent_dtr.map((dtr) => (
                                <tr key={dtr.id} className="border-b border-gray-50 last:border-0">
                                  <td className="py-3 pr-3 font-medium text-gray-800">{formatDate(dtr.date)}</td>
                                  <td className="py-3 pr-3 font-mono text-xs text-gray-600">{dtr.am_in || "—"}</td>
                                  <td className="py-3 pr-3 font-mono text-xs text-gray-600">{dtr.am_out || "—"}</td>
                                  <td className="py-3 pr-3 font-mono text-xs text-gray-600">{dtr.pm_in || "—"}</td>
                                  <td className="py-3 pr-3 font-mono text-xs text-gray-600">{dtr.pm_out || "—"}</td>
                                  <td className="py-3 text-right"><StatusChip status={dtr.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                    <div className="pt-3">
                      <Button asChild variant="outline" size="sm" className="h-8 w-full rounded-xl text-xs sm:w-auto">
                        <Link to="/intern/dtr-logs" className="gap-1.5">
                          View all DTR logs <ArrowRight size={12} />
                        </Link>
                      </Button>
                    </div>
                  </SectionCard>
                </div>

                <SectionCard
                  title="Recent Journals"
                  subtitle="Your latest entries"
                  action={<NotebookPen size={18} className="text-gray-300" />}
                >
                  {data.recent_journals?.length === 0 ? (
                    <div className="py-8 text-center">
                      <NotebookPen size={28} className="mx-auto text-gray-300" />
                      <p className="mt-2 text-sm text-gray-400">No journals yet.</p>
                      <Button asChild variant="outline" className="mt-3 h-9 rounded-xl">
                        <Link to="/intern/journals" className="gap-1.5">
                          Write journal <ArrowRight size={14} />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.recent_journals.map((journal) => (
                        <div key={journal.id} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-800">{journal.title || "Untitled"}</span>
                            <span className="shrink-0 font-mono text-[11px] text-gray-400">{formatDate(journal.date)}</span>
                          </div>
                          {journal.excerpt && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{journal.excerpt}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-3">
                    <Button asChild variant="ghost" size="sm" className="h-8 w-full rounded-xl text-xs text-green-700 hover:text-green-800">
                      <Link to="/intern/journals" className="gap-1.5">
                        View all journals <ArrowRight size={12} />
                      </Link>
                    </Button>
                  </div>
                </SectionCard>
              </section>

              <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <SectionCard title="Internship Details" subtitle="Your assigned institute, program and academic year">
                    {data.intern ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                        {[
                          { icon: Building2, label: "Institute", value: data.intern.institute || "—" },
                          { icon: BookOpen, label: "Program", value: data.intern.program || "—" },
                          { icon: CalendarDays, label: "Academic Year", value: data.intern.academic_year || "—" },
                          { icon: UserRound, label: "Instructor", value: data.intern.practicum_instructor || "—" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                              <item.icon size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{item.label}</p>
                              <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <Building2 size={28} className="text-gray-300" />
                        <p className="text-sm text-gray-500">Your internship details haven&apos;t been set up yet.</p>
                      </div>
                    )}
                  </SectionCard>
                </div>

                <SectionCard title="Account" subtitle="Your contact information">
                  <div className="space-y-3">
                    {[
                      { label: "Email", value: data.user.email || "—" },
                      { label: "Contact", value: data.user.contact_number || "—" },
                      { label: "Registered", value: formatDate(data.user.created_at) },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{item.label}</span>
                        <span className="truncate text-sm font-semibold text-gray-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </section>
            </>
          )}
        </>
      )}
    </InternLayout>
  );
}
