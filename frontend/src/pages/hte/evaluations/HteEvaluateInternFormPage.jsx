import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Hash,
  Lightbulb,
  Loader2,
  Mail,
  Phone,
  School,
  Send,
  UserRound,
} from "lucide-react";
import HteLayout from "@/layouts/HteLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { ratingOptions, categorySections } from "@/pages/hte/evaluations/constants.js";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusChip from "@/components/StatusChip.jsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function RatingOption({ option, selected, disabled }) {
  const isNa = option.value === "na";
  return (
    <label
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        selected
          ? "border-green-500 bg-green-50"
          : disabled
            ? "border-gray-200 bg-gray-50"
            : "border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/40"
      )}
    >
      <RadioGroupItem value={option.value} disabled={disabled} />
      <span className="min-w-0 text-sm">
        <span className="font-semibold text-gray-900">{isNa ? "N/A" : `${option.value} – ${option.label}`}</span>
        {isNa && <span className="ml-1.5 text-xs text-gray-400">Not applicable</span>}
      </span>
    </label>
  );
}

export default function HteEvaluateInternFormPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/hte/evaluations/${uuid}`);
      const payload = res.data.data;
      setData(payload);
      const initial = {};
      payload.criteria.forEach((criterion) => {
        if (criterion.response) {
          initial[criterion.id] = criterion.response.is_na
            ? "na"
            : String(criterion.response.rating);
        }
      });
      setValues(initial);
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
  const answeredCount = (data?.criteria ?? []).filter((criterion) => Boolean(values[criterion.id])).length;
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
  const allAnswered = totalCount > 0 && answeredCount === totalCount;
  const isSubmitted = useMemo(
    () => Boolean(data?.criteria?.length && data.criteria.every((c) => c.response !== null)),
    [data]
  );

  function setRating(criterionId, value) {
    if (isSubmitted) return;
    setValues((prev) => ({ ...prev, [criterionId]: value }));
  }

  function handleSubmit() {
    if (submitting || !allAnswered || isSubmitted) return;
    setConfirmOpen(true);
  }

  async function handleConfirmSubmit() {
    if (submitting || !allAnswered || isSubmitted) return;
    setSubmitting(true);
    try {
      const responses = Object.entries(values).map(([criterionId, value]) => ({
        criterion_id: Number(criterionId),
        rating: value === "na" ? null : Number(value),
        is_na: value === "na",
      }));
      await api.post(`/hte/evaluations/${uuid}`, { responses });
      toast.success("Evaluation submitted", {
        description: `${data.intern.full_name}'s evaluation was saved.`,
      });
      setConfirmOpen(false);
      navigate("/hte/evaluations");
    } catch (err) {
      toast.error("Submission failed", { description: firstErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <HteLayout>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          className="h-11 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-green-700"
        >
          <Link to="/hte/evaluations">
            <ArrowLeft size={16} /> Back to evaluate interns
          </Link>
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-xl text-green-700">
            <Link to="/hte/evaluations">Back to evaluate interns</Link>
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
                  {data.intern.profile_picture && (
                    <AvatarImage src={data.intern.profile_picture} alt={data.intern.full_name} />
                  )}
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

          {isSubmitted && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
              <ClipboardCheck size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Evaluation submitted — read only</p>
                <p className="mt-0.5 text-sm leading-relaxed text-amber-800">
                  This evaluation has been submitted and can no longer be edited. The responses below are final.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-700">
                {answeredCount} of {totalCount} indicators answered
              </p>
              <span className="font-mono text-sm font-bold text-green-700">{progress}%</span>
            </div>
            <Progress value={progress} className="mt-2 h-2.5" />
            {!isSubmitted && !allAnswered && (
              <p className="mt-2 text-xs text-gray-400">
                {totalCount - answeredCount} indicator{totalCount - answeredCount === 1 ? "" : "s"} still need an
                answer.
              </p>
            )}
          </div>

          {totalCount === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <ClipboardCheck size={20} />
              </div>
              <p className="text-sm font-semibold text-gray-700">No evaluation criteria yet</p>
              <p className="max-w-sm text-xs text-gray-400">
                The coordinator has not set up intern evaluation criteria for this institute yet.
              </p>
            </div>
          )}

          <div className="space-y-8">
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
                    {section.items.map((criterion, index) => (
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
                        <RadioGroup
                          value={values[criterion.id] ?? ""}
                          onValueChange={(value) => setRating(criterion.id, value)}
                          disabled={isSubmitted}
                          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
                        >
                          {ratingOptions.map((option) => (
                            <RatingOption
                              key={option.value}
                              option={option}
                              selected={values[criterion.id] === option.value}
                              disabled={isSubmitted}
                            />
                          ))}
                        </RadioGroup>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {isSubmitted ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center shadow-sm ring-1 ring-gray-100 sm:p-5">
              <ClipboardCheck size={16} className="shrink-0 text-gray-400" />
              <p className="text-sm font-semibold text-gray-500">This evaluation is final and cannot be edited.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <p className="text-sm text-gray-500">
                {allAnswered
                  ? "All indicators answered — ready to submit."
                  : `${totalCount - answeredCount} indicator${totalCount - answeredCount === 1 ? "" : "s"} still need an answer.`}
              </p>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                className="h-12 w-full rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:w-auto sm:min-w-44"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Submit evaluation
              </Button>
            </div>
          )}

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Submit evaluation?</DialogTitle>
                <DialogDescription>
                  You are about to submit the evaluation for <span className="font-semibold text-gray-900">{data.intern.full_name}</span>.
                  Once submitted, this evaluation will become read-only and cannot be changed.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                <p className="text-xs font-semibold leading-relaxed text-amber-800">
                  Please review all {totalCount} ratings carefully before confirming. This action is final.
                </p>
              </div>
              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                  disabled={submitting}
                  className="h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                  className="h-11 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Confirm and submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </HteLayout>
  );
}