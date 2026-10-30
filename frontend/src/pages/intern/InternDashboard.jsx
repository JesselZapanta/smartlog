import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  ArrowRight,
  Camera,
  NotebookPen,
  FolderUp,
  ClipboardCheck,
  Clock3,
  XCircle,
  Building2,
  BookOpen,
  CalendarDays,
  UserRound,
  FileText,
  Loader2,
  AlertTriangle,
  TrendingUp,
  PartyPopper,
  RefreshCw,
  ThumbsDown,
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

/**
 * Terminal-result banner for the intern dashboard.
 *
 * `result` is the dashboard's `final_result`: null until a term is graded, otherwise
 * { outcome: 'passed' | 'failed', academic_year, grade, is_latest }. A pass is
 * congratulatory; a failure is an honest heads-up with a route back into the re-enrol
 * flow, and only ever shown while it is the newest graded term.
 */
function FinalResultBanner({ result }) {
  if (!result) return null;

  if (result.outcome === "passed") {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-sm sm:p-5">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-green-100/50" />
        <div className="relative z-10 flex items-start gap-3 sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white shadow-sm">
            <PartyPopper size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-base font-bold text-green-900 sm:text-lg">
              Congratulations{result.is_latest ? "" : " on your OJT"}
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-green-800">
              You have <span className="font-semibold">passed</span> your OJT
              {result.academic_year ? ` for ${result.academic_year}` : ""}. Your OJT
              requirements are complete.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
          <ThumbsDown size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-bold text-amber-900 sm:text-lg">
            Not passed this term
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-amber-800">
            Your OJT was recorded as <span className="font-semibold">failed</span>
            {result.academic_year ? ` for ${result.academic_year}` : ""}. You may apply to enrol
            again in a later term.
          </p>
        </div>
      </div>
      <Button asChild className="mt-4 h-11 w-full rounded-xl bg-amber-600 font-semibold text-white hover:bg-amber-700 sm:w-auto">
        <Link to="/intern/enrollment">
          Apply to re-enrol <ArrowRight size={16} />
        </Link>
      </Button>
    </section>
  );
}

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

/**
 * Notice for a term whose enrollment application is still under review.
 *
 * A pending application has no enrollment row yet, so this is the only thing the
 * dashboard can show for it. Without it the page would open on the pending term and
 * render nothing at all.
 */
function PendingApplicationBanner({ application }) {
  if (!application) return null;

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 ring-1 ring-sky-200">
          <Clock3 size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-bold text-sky-900 sm:text-lg">
            OJT enrollment under review
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-sky-800">
            Your application to enrol for OJT
            {application.academic_year ? ` in ${application.academic_year}` : ""} is waiting for your
            coordinator. Your hours, journals and requirements will appear here once it is
            approved.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Prompt for an intern who has registered but never applied for OJT enrollment.
 *
 * OJT hours are declared on the enrollment application, so until one exists there is no
 * requirement to work toward and nothing for the HTE to complete. This is the action
 * item that closes that gap.
 */
function NotEnrolledBanner({ requiredHours, hasApplication }) {
  if (requiredHours != null || hasApplication) return null;

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 ring-1 ring-sky-200">
          <RefreshCw size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-bold text-sky-900 sm:text-lg">
            Apply to enrol for OJT
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-sky-800">
            You have not applied for an OJT enrollment yet. Hours are declared when you
            apply, and your progress is measured against that figure — so enrol first to
            see your target.
          </p>
        </div>
      </div>
      <Button asChild className="mt-4 h-11 w-full rounded-xl bg-sky-600 font-semibold text-white hover:bg-sky-700 sm:w-auto">
        <Link to="/intern/enrollment">
          Apply to enrol <ArrowRight size={16} />
        </Link>
      </Button>
    </section>
  );
}

/**
 * Notice for a term that closed without the intern completing their OJT.
 *
 * `term` is the dashboard's `incomplete_term`: null unless the academic year of the
 * term being viewed is over, the OJT was never marked completed, and no grade was
 * ever recorded. This is deliberately softer than the failure banner above — nothing
 * was graded against the intern, the term simply ended first — so it uses an outlined
 * icon rather than the solid block the failure uses.
 */
function IncompleteTermBanner({ term }) {
  if (!term) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 ring-1 ring-amber-200">
          <AlertTriangle size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-bold text-amber-900 sm:text-lg">
            OJT not completed
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-amber-800">
            Your OJT{term.academic_year ? ` for ${term.academic_year}` : ""} ended without being
            completed, and no grade was recorded. Your hours and requirements are kept on
            record — speak to your OJT coordinator about continuing.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Transfer lifecycle banner driven by GET /intern/transfer-request.
 *
 * `transfer` is null when no transfer touches the term (or the intern has already
 * been re-deployed after one). While a request is open the banner tracks it through
 * requested → accepted (with a CTA into the early-unlocked HTE evaluation) →
 * evaluated; after reassignment it points at the new host until deployment.
 */
function TransferBanner({ transfer }) {
  if (!transfer) return null;

  if (transfer.status === "reassigned") {
    return (
      <section className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-green-600 ring-1 ring-green-200">
            <ArrowLeftRight size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-base font-bold text-green-900 sm:text-lg">
              Reassigned to {transfer.to_hte?.name || "your new host"}
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-green-800">
              Your transfer is complete. Submit the new host&apos;s requirements and wait for your coordinator
              to re-deploy you before logging DTR or journal entries.
            </p>
          </div>
        </div>
        <Button asChild className="mt-4 h-11 w-full rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:w-auto">
          <Link to="/intern/requirements">
            Go to requirements <ArrowRight size={16} />
          </Link>
        </Button>
      </section>
    );
  }

  if (transfer.status === "evaluated") {
    return (
      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 ring-1 ring-violet-200">
            <ArrowLeftRight size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-base font-bold text-violet-900 sm:text-lg">
              Transfer ready for reassignment
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-violet-800">
              All evaluations for the closing placement are complete. Your coordinator will assign you to a new
              host establishment soon.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (transfer.status === "accepted") {
    const shouldEvaluate = transfer.evaluation?.can_evaluate && !transfer.evaluation?.complete;
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 ring-1 ring-amber-200">
            <ArrowLeftRight size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-base font-bold text-amber-900 sm:text-lg">
              Transfer in progress
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-amber-800">
              {shouldEvaluate
                ? `Your host accepted the transfer. Rate ${transfer.from_hte?.name || "your HTE"} for the placement that is closing so the reassignment can proceed.`
                : "You have rated your outgoing host. Waiting for the host's evaluation to finish the transfer."}
            </p>
          </div>
        </div>
        {shouldEvaluate && (
          <Button asChild className="mt-4 h-11 w-full rounded-xl bg-amber-600 font-semibold text-white hover:bg-amber-700 sm:w-auto">
            <Link to="/intern/evaluations">
              Rate {transfer.from_hte?.name || "your HTE"} <ArrowRight size={16} />
            </Link>
          </Button>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 ring-1 ring-sky-200">
          <ArrowLeftRight size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-bold text-sky-900 sm:text-lg">
            Transfer requested
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-sky-800">
            A transfer away from {transfer.from_hte?.name || "your host"} is waiting for the host&apos;s
            acceptance. You will be asked to rate your HTE once it is accepted.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function InternDashboard() {
  const { user } = useAuth();
  const now = useClock();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [academicYearId, setAcademicYearId] = useState("");
  const [transfer, setTransfer] = useState(null);

  // No term is selected on first load: with no academic_year_id the API resolves the
  // intern's active enrollment, which is the correct default for every user. The
  // dropdown is then built from the terms that response reports.
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (academicYearId) params.set("academic_year_id", academicYearId);
    const qs = params.toString();
    api
      .get(`/dashboard${qs ? `?${qs}` : ""}`)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [academicYearId]);

  useEffect(() => {
    load();
  }, [load]);

  // The transfer banner tracks the current term's flow; it is harmless when the
  // intern holds no transfer (the endpoint answers null).
  useEffect(() => {
    api
      .get("/intern/transfer-request")
      .then((res) => setTransfer(res.data.data))
      .catch(() => setTransfer(null));
  }, []);

  // Every term on record; held ones are flagged. Selecting a term with no records
  // returns an empty payload rather than an error.
  const enrolledTerms = data?.enrolled_terms ?? [];
  const heldTermCount = enrolledTerms.filter((term) => term.is_enrolled).length;
  // `viewing_academic_year_id` is the term the API actually served. It comes first
  // because it can be a term the intern holds no enrollment row for yet — a pending
  // application on the active academic year — which the fallbacks below would skip.
  const selectedTermId = String(
    academicYearId ||
      data?.viewing_academic_year_id ||
      data?.intern?.academic_year_id ||
      enrolledTerms[0]?.id ||
      ""
  );
  const selectedTerm = enrolledTerms.find((term) => String(term.id) === selectedTermId);
  // An explicit selection defaults to "not held" when the term is not in the list,
  // so a failed lookup shows the explanatory empty state rather than a broken page.
  const viewingHeldTerm = academicYearId ? (selectedTerm?.is_enrolled ?? false) : true;
  // A term with a pending application is not "no records" — the intern is mid-review for
  // it, and the pending banner says exactly that. Showing both read as a contradiction.
  const showNoRecordsState = academicYearId && !viewingHeldTerm && !data?.pending_application;

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
          value={selectedTermId}
          onValueChange={setAcademicYearId}
          disabled={loading || !enrolledTerms.length}
        >
          <SelectTrigger className="h-11 w-full rounded-xl bg-white sm:w-[280px]">
            <SelectValue placeholder="Academic Year" />
          </SelectTrigger>
          <SelectContent>
            {enrolledTerms.map((term) => (
              <SelectItem key={term.id} value={String(term.id)}>
                {term.description || term.code}
                {term.is_enrolled ? "" : " · No records"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {heldTermCount > 1 && (
          <Button
            variant="ghost"
            className="h-11 rounded-xl text-gray-500 hover:bg-gray-700"
            onClick={() => setAcademicYearId("")}
            disabled={loading || !academicYearId}
          >
            <RefreshCw size={15} /> Current term
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-600">{error}</p>
      ) : (
        <>
          {showNoRecordsState && (
            <section className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center shadow-sm ring-1 ring-gray-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <CalendarDays size={20} />
              </div>
              <p className="text-sm font-semibold text-gray-700">No records for this term</p>
              <p className="max-w-sm text-xs text-gray-400">
                You were not enrolled for {selectedTerm?.description || "this academic year"}, so there are no
                hours, journals or requirements to show.
              </p>
              <Button
                variant="outline"
                className="mt-1 h-10 rounded-xl text-green-700"
                onClick={() => setAcademicYearId("")}
              >
                Back to current term
              </Button>
            </section>
          )}

          <PendingApplicationBanner application={data.pending_application} />

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
              {data.rejected_application && (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm sm:p-5">
                  <div className="flex items-start gap-3 sm:items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                      <XCircle size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-heading text-base font-bold text-red-900">
                        OJT enrollment rejected
                      </h2>
                      <p className="mt-0.5 text-sm text-red-700">
                        Your OJT enrollment
                        {data.rejected_application.academic_year
                          ? ` for ${data.rejected_application.academic_year}`
                          : ""}{" "}
                        was not approved. Review the reason, then re-enroll and submit.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-red-100">
                    <p className="text-xs font-bold uppercase tracking-wide text-red-500">Reason</p>
                    <p className="mt-1 text-sm text-gray-800">
                      {data.rejected_application.rejection_reason || "No reason provided."}
                    </p>
                  </div>
                  <Button asChild className="mt-4 h-11 w-full rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700 sm:w-auto">
                    <Link to="/intern/enrollment">
                      Re-enroll and submit <ArrowRight size={16} />
                    </Link>
                  </Button>
                </section>
              )}

              <FinalResultBanner result={data.final_result} />

              <IncompleteTermBanner term={data.incomplete_term} />

              <NotEnrolledBanner
                requiredHours={data.ojt_hours?.required}
                hasApplication={Boolean(data.pending_application || data.application)}
              />

              <TransferBanner transfer={transfer} />

              <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatCard
                  label="OJT Hours"
                  value={data.ojt_hours?.earned ?? 0}
                  helper={
                    data.ojt_hours?.required != null
                      ? `of ${data.ojt_hours.required} required`
                      : "not declared yet"
                  }
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
