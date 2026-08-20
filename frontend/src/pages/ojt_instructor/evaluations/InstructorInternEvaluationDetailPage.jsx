import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Hash,
  Lightbulb,
  Mail,
  Phone,
  School,
  UserRound,
} from "lucide-react";
import InstructorLayout from "@/layouts/InstructorLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { ratingOptions, categorySections } from "@/pages/hte/evaluations/constants.js";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusChip from "@/components/StatusChip.jsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import PageLoader from "@/components/PageLoader";

const sectionIcons = {
  personal_characteristics: UserRound,
  work_characteristics: Briefcase,
  job_knowledge: Lightbulb,
};

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function HeroChip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/30 backdrop-blur">
      {Icon && <Icon size={11} className="text-green-100" />}
      {children}
    </span>
  );
}

function RatingOption({ option, selected }) {
  const isNa = option.value === "na";
  return (
    <label
      className={cn(
        "flex cursor-not-allowed items-center gap-3 rounded-xl border px-3.5 py-3 opacity-60",
        selected ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50"
      )}
    >
      <RadioGroupItem value={option.value} disabled />
      <span className="min-w-0 text-sm">
        <span className="font-semibold text-gray-900">{isNa ? "N/A" : `${option.value} – ${option.label}`}</span>
        {isNa && <span className="ml-1.5 text-xs text-gray-400">Not applicable</span>}
      </span>
    </label>
  );
}

export default function CoordinatorInternEvaluationDetailPage() {
  const { uuid } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/instructor/intern-evaluations/${uuid}`);
      setData(res.data.data);
    } catch (err) {
      setError(firstErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const byCategory = new Map(categorySections.map((section) => [section.key, []]));
    (data?.criteria ?? []).forEach((criterion) => {
      byCategory.get(criterion.category)?.push(criterion);
    });
    return categorySections
      .map((section) => ({ ...section, items: byCategory.get(section.key) ?? [] }))
      .filter((section) => section.items.length > 0);
  }, [data]);

  const totalCount = data?.criteria.length ?? 0;
  const answeredCount = (data?.criteria ?? []).filter((c) => c.response !== null).length;
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
  const isSubmitted = totalCount > 0 && answeredCount === totalCount;

  const categoryAverages = useMemo(() => {
    const map = {};
    for (const section of categorySections) {
      const items = grouped.find((g) => g.key === section.key)?.items ?? [];
      const answered = items.map((c) => c.response).filter((r) => r != null);
      const ratings = answered.map((r) => (r.is_na ? 0 : r.rating));
      const avg = answered.length ? ratings.reduce((a, b) => a + b, 0) / answered.length : null;
      const naCount = answered.filter((r) => r.is_na).length;
      map[section.key] = { avg, count: answered.length - naCount, total: items.length, naCount, answeredCount: answered.length };
    }
    return map;
  }, [grouped]);

  const weightedAverage = useMemo(() => {
    const p = categoryAverages.personal_characteristics?.avg;
    const w = categoryAverages.work_characteristics?.avg;
    const j = categoryAverages.job_knowledge?.avg;
    if (p == null && w == null && j == null) return null;
    return (p ?? 0) * 0.3 + (w ?? 0) * 0.3 + (j ?? 0) * 0.4;
  }, [categoryAverages]);

  return (
    <InstructorLayout>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          className="h-11 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-green-700"
        >
          <Link to="/instructor/intern-evaluations">
            <ArrowLeft size={16} /> Back to intern evaluations
          </Link>
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-xl text-green-700">
            <Link to="/instructor/intern-evaluations">Back to intern evaluations</Link>
          </Button>
        </div>
      ) : data ? (
        <>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 via-green-700 to-emerald-500 p-5 shadow-lg sm:p-7">
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/5" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar className="h-16 w-16 shrink-0 border-2 border-white/40 shadow-md sm:h-20 sm:w-20">
                  {data.intern.profile_picture && <AvatarImage src={data.intern.profile_picture} alt={data.intern.full_name} />}
                  <AvatarFallback className="bg-gradient-to-br from-white/25 to-white/10 text-lg font-bold text-white">
                    {getInitials(data.intern.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="truncate font-heading text-2xl font-bold text-white sm:text-3xl">
                    {data.intern.full_name}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-green-100">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail size={13} /> {data.intern.email}
                    </span>
                    {data.intern.contact_number && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone size={13} /> {data.intern.contact_number}
                      </span>
                    )}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <HeroChip icon={Hash}>{data.intern.id}</HeroChip>
                    {data.intern.program && <HeroChip icon={School}>{data.intern.program}</HeroChip>}
                    {data.intern.institute && <HeroChip icon={Building2}>{data.intern.institute}</HeroChip>}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusChip status={data.intern.status} />
                  {data.intern.ojt_status && data.intern.ojt_status !== "pending" && (
                    <StatusChip status={data.intern.ojt_status} />
                  )}
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-100">
                  <CalendarDays size={12} /> Registered {formatDate(data.intern.created_at)}
                </span>
              </div>
            </div>
          </div>

          {data.hte && (
            <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm ring-1 ring-green-100">
              <div className="flex items-center gap-3 border-b border-green-100/70 bg-green-50/60 px-4 py-3 sm:px-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
                  <Building2 size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-700/70">Host Training Establishment</p>
                  <p className="truncate font-heading text-base font-bold text-green-950">{data.hte.name}</p>
                </div>
                {data.hte.status && <StatusChip status={data.hte.status} />}
              </div>
              <div className="grid grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
                <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5">
                  <Building2 size={14} className="shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Institute</p>
                    <p className="truncate text-sm font-semibold text-gray-800">{data.hte.institute || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5">
                  <School size={14} className="shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Program</p>
                    <p className="truncate text-sm font-semibold text-gray-800">{data.hte.program || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-2xl bg-blue-50 p-3.5 ring-1 ring-blue-200">
            <ClipboardCheck size={18} className="mt-0.5 shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Read-only evaluation</p>
              <p className="mt-0.5 text-sm leading-relaxed text-blue-800">
                This evaluation was submitted by the HTE. You are viewing it in read-only mode.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-700">
                {answeredCount} of {totalCount} indicators answered
              </p>
              <span className="font-mono text-sm font-bold text-green-700">{progress}%</span>
            </div>
            <Progress value={progress} className="mt-2 h-2.5" />
            {!isSubmitted && (
              <p className="mt-2 text-xs text-amber-600">
                {totalCount - answeredCount} indicator{totalCount - answeredCount === 1 ? "" : "s"} not yet evaluated by HTE.
              </p>
            )}
          </div>

          {totalCount > 0 && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-2.5 border-b border-gray-50 px-4 py-3 sm:px-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                  <Award size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-sm font-bold text-green-950">Evaluation Summary</h2>
                  <p className="text-xs text-gray-500">Average rating per category</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-3">
                {categorySections.map((section) => {
                  const Icon = sectionIcons[section.key];
                  const avgData = categoryAverages[section.key];
                  const weight = section.key === "job_knowledge" ? "40%" : "30%";
                  const tone =
                    section.key === "personal_characteristics"
                      ? "bg-blue-50 text-blue-600 ring-blue-100"
                      : section.key === "work_characteristics"
                        ? "bg-amber-50 text-amber-600 ring-amber-100"
                        : "bg-emerald-50 text-emerald-600 ring-emerald-100";
                  return (
                    <div key={section.key} className="bg-white p-4">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${tone}`}>
                          <Icon size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold leading-tight text-gray-800">{section.title}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{weight} weight</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="font-heading text-2xl font-bold text-green-950">
                          {avgData.avg != null ? avgData.avg.toFixed(2) : "—"}
                        </span>
                        <span className="text-xs font-semibold text-gray-400">/ 5.00</span>
                      </div>
                      <div className="mt-1.5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-green-600 to-emerald-500 transition-all"
                            style={{ width: `${avgData.avg != null ? (avgData.avg / 5) * 100 : 0}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-gray-500">
                          {avgData.answeredCount} of {avgData.total} answered
                          {avgData.naCount > 0 ? ` · ${avgData.naCount} N/A as 0` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {weightedAverage != null && (
                <div className="flex items-center justify-between gap-3 border-t border-green-600 bg-gradient-to-br from-green-600 to-emerald-500 px-4 py-3 text-xs sm:px-5">
                  <span className="font-semibold text-green-50">
                    Weighted Average = (Personal 30% + Work 30% + Job Knowledge 40%)
                  </span>
                  <span className="font-heading text-sm font-bold text-white">{weightedAverage.toFixed(2)} / 5.00</span>
                </div>
              )}
            </div>
          )}

          {totalCount === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <ClipboardCheck size={20} />
              </div>
              <p className="text-sm font-semibold text-gray-700">No evaluation criteria yet</p>
              <p className="max-w-sm text-xs text-gray-400">No active intern evaluation criteria for this institute.</p>
            </div>
          )}

          <Accordion type="single" collapsible>
            <AccordionItem value="evaluation-details" className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
              <AccordionTrigger className="px-4 py-3 hover:no-underline sm:px-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
                    <ClipboardCheck size={16} />
                  </div>
                  <div className="text-left">
                    <p className="font-heading text-sm font-bold text-green-950">Evaluation Details</p>
                    <p className="text-xs text-gray-500">Tap to view questions</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 sm:px-5">
                <div className="space-y-8 pt-2">
                  {grouped.map((section) => {
                    const Icon = sectionIcons[section.key];
                    return (
                      <section key={section.key} className="space-y-4">
                        <div className="flex items-center gap-2.5 px-1">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
                            <Icon size={17} />
                          </div>
                          <div className="min-w-0">
                            <h2 className="font-heading text-lg font-bold text-green-950">{section.title}</h2>
                            <p className="text-xs text-gray-500">{section.description}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {section.items.map((criterion, index) => {
                            const selectedValue = criterion.response
                              ? criterion.response.is_na
                                ? "na"
                                : String(criterion.response.rating)
                              : "";
                            return (
                              <div
                                key={criterion.id}
                                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5"
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[11px] font-bold text-gray-500">
                                    {index + 1}
                                  </span>
                                  <p className="text-sm font-medium leading-relaxed text-gray-800">{criterion.indicator}</p>
                                </div>
                                <RadioGroup value={selectedValue} disabled className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {ratingOptions.map((option) => (
                                    <RatingOption
                                      key={option.value}
                                      option={option}
                                      selected={selectedValue === option.value}
                                    />
                                  ))}
                                </RadioGroup>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      ) : null}
    </InstructorLayout>
  );
}