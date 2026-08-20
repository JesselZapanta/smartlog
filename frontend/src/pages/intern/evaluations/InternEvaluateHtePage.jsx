import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Briefcase,
  Building2,
  ClipboardCheck,
  GraduationCap,
  Lightbulb,
  Loader2,
  Mail,
  School,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import InternLayout from "@/layouts/InternLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { ratingOptions, categorySections } from "@/pages/intern/evaluations/constants.js";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";

const sectionIcons = {
  personal_characteristics: UserRound,
  work_characteristics: Briefcase,
  job_knowledge: Lightbulb,
};

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

export default function InternEvaluateHtePage() {
  const [data, setData] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isGateError, setIsGateError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setIsGateError(false);
    try {
      const res = await api.get("/intern/evaluations");
      const payload = res.data.data;
      setData(payload);
      const initial = {};
      payload.criteria.forEach((criterion) => {
        if (criterion.response) {
          initial[criterion.id] = criterion.response.is_na ? "na" : String(criterion.response.rating);
        }
      });
      setValues(initial);
    } catch (err) {
      const msg = firstErrorMessage(err);
      const errors = err.response?.data?.errors;
      if (errors?.ojt_status) {
        setIsGateError(true);
        setError(errors.ojt_status[0] || msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
      await api.post("/intern/evaluations", { responses });
      toast.success("Evaluation submitted", {
        description: `Your evaluation for ${data.hte?.name || "your HTE"} was saved.`,
      });
      setConfirmOpen(false);
      await load();
    } catch (err) {
      toast.error("Submission failed", { description: firstErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <InternLayout>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold text-green-950 sm:text-3xl">Evaluate HTE</h1>
        <p className="text-sm text-gray-500">
          Rate your Host Training Establishment. This helps improve the OJT experience for future interns.
        </p>
      </div>

      {loading ? (
        <PageLoader />
      ) : isGateError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-600 ring-1 ring-amber-200">
            <ShieldCheck size={22} />
          </div>
          <h2 className="font-heading text-lg font-bold text-amber-900">Evaluation not yet available</h2>
          <p className="max-w-md text-sm leading-relaxed text-amber-800">{error}</p>
          <p className="max-w-md text-xs text-amber-700">
            This evaluation opens once your OJT hours are marked as completed by your HTE. Check back after your hours are
            completed.
          </p>
          <Button asChild variant="outline" className="mt-2 h-10 rounded-xl">
            <Link to="/intern">Back to dashboard</Link>
          </Button>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4 h-10 rounded-xl text-green-700" onClick={load}>
            Try again
          </Button>
        </div>
      ) : data ? (
        <>
          {!data.hte ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100 sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <Building2 size={22} />
              </div>
              <h2 className="font-heading text-lg font-bold text-gray-800">No HTE assigned</h2>
              <p className="max-w-md text-sm text-gray-500">
                You don&apos;t have an assigned Host Training Establishment to evaluate yet. Contact your coordinator.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm ring-1 ring-green-100">
                <div className="bg-gradient-to-br from-green-800 via-green-700 to-emerald-500 p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur sm:h-16 sm:w-16">
                      <Building2 size={26} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-green-200">Host Training Establishment</p>
                      <h2 className="truncate font-heading text-xl font-bold text-white sm:text-2xl">{data.hte.name}</h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-green-100">
                        {data.hte.institute && (
                          <span className="inline-flex items-center gap-1.5">
                            <GraduationCap size={13} /> {data.hte.institute}
                          </span>
                        )}
                        {data.hte.program && (
                          <span className="inline-flex items-center gap-1.5">
                            <School size={13} /> {data.hte.program}
                          </span>
                        )}
                        {data.hte.email && (
                          <span className="inline-flex items-center gap-1.5">
                            <Mail size={13} /> {data.hte.email}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 bg-green-50/60 px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                    <Building2 size={13} /> Evaluating HTE
                  </span>
                  {data.hte.status && (
                    <Badge className="rounded-full bg-white font-semibold text-green-700 ring-1 ring-green-200">
                      {data.hte.status}
                    </Badge>
                  )}
                </div>
              </div>

              {isSubmitted && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
                  <ClipboardCheck size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Evaluation submitted — read only</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-amber-800">
                      Your evaluation has been submitted and can no longer be edited. The responses below are final.
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
                    {totalCount - answeredCount} indicator{totalCount - answeredCount === 1 ? "" : "s"} still need an answer.
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
                    Your coordinator has not set up HTE evaluation criteria for your institute yet.
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
                  <p className="text-sm font-semibold text-gray-500">Your evaluation is final and cannot be edited.</p>
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
                    <DialogTitle>Submit HTE evaluation?</DialogTitle>
                    <DialogDescription>
                      You are about to submit your evaluation for{" "}
                      <span className="font-semibold text-gray-900">{data.hte.name}</span>. Once submitted, it will become
                      read-only and cannot be changed.
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
          )}
        </>
      ) : null}
    </InternLayout>
  );
}