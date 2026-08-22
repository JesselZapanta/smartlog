import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  ExternalLink,
  GraduationCap,
  Info,
  Loader2,
  Lock,
  Mail,
  Rocket,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { typeLabel, typeTone } from "@/pages/admin/requirements/constants.js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusChip from "@/components/StatusChip";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import PageLoader from "@/components/PageLoader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMinutes(totalMinutes) {
  const minutes = totalMinutes || 0;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600 ring-1 ring-green-100">
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="truncate text-sm font-semibold text-gray-800">{value || "—"}</p>
      </div>
    </div>
  );
}

function DialogInfo({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-gray-100 bg-gray-50/60 p-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-600 ring-1 ring-green-100">
        <Icon size={12} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="break-words text-xs font-semibold text-gray-800">{value || "—"}</p>
      </div>
    </div>
  );
}

function TypePill({ type }) {
  return (
    <Badge className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${typeTone[type] || "bg-gray-50 text-gray-600 ring-gray-200"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {typeLabel[type] || type}
    </Badge>
  );
}

function StatusPill({ status }) {
  if (status === "approved") {
    return (
      <Badge className="inline-flex items-center gap-1.5 rounded-full bg-green-50 font-semibold text-green-700 ring-1 ring-green-200">
        <CheckCircle2 size={12} /> Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="inline-flex items-center gap-1.5 rounded-full bg-red-50 font-semibold text-red-700 ring-1 ring-red-200">
        <AlertTriangle size={12} /> Rejected
      </Badge>
    );
  }
  return (
    <Badge className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 font-semibold text-amber-700 ring-1 ring-amber-200">
      <Clock3 size={12} /> Pending
    </Badge>
  );
}

function StatusTags({ title, approved, pending, rejected }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm ring-1 ring-gray-100">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-green-50 px-1.5 py-2 ring-1 ring-green-100">
          <CheckCircle2 size={13} className="shrink-0 text-green-600" />
          <span className="text-sm font-bold text-green-700">{approved}</span>
          <span className="truncate text-[11px] font-semibold text-green-700/70">Approved</span>
        </div>
        <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-1.5 py-2 ring-1 ring-amber-100">
          <Clock3 size={13} className="shrink-0 text-amber-500" />
          <span className="text-sm font-bold text-amber-700">{pending}</span>
          <span className="truncate text-[11px] font-semibold text-amber-700/70">Pending</span>
        </div>
        <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-red-50 px-1.5 py-2 ring-1 ring-red-100">
          <AlertTriangle size={13} className="shrink-0 text-red-600" />
          <span className="text-sm font-bold text-red-700">{rejected}</span>
          <span className="truncate text-[11px] font-semibold text-red-700/70">Rejected</span>
        </div>
      </div>
    </div>
  );
}

function RequirementCard({ requirement, actingId, onApprove, onReject }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-sm font-bold text-green-950">{requirement.name}</p>
          {requirement.description && (
            <p className="mt-1 text-xs text-gray-500">{requirement.description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <TypePill type={requirement.type} />
          {requirement.submission && <StatusPill status={requirement.submission.status} />}
        </div>
      </div>

      {requirement.submission?.status === "rejected" && requirement.submission.rejection_reason && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-600" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">Rejection reason</p>
            <p className="mt-0.5 text-sm text-red-800">{requirement.submission.rejection_reason}</p>
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-gray-50 pt-4">
        {requirement.submission ? (
          <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
            <div className="min-w-0 text-sm font-medium text-green-800">
              <p className="truncate">Submitted {formatDate(requirement.submission.submitted_at)}</p>
              {requirement.submission.reviewed_by && (
                <p className="mt-0.5 truncate text-xs text-green-700/70">
                  reviewed by {requirement.submission.reviewed_by}
                </p>
              )}
            </div>
            <a
              href={requirement.submission.file_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open submitted PDF"
              className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-green-700 transition-colors hover:bg-green-100"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Not yet submitted</p>
        )}

        {requirement.submission?.status === "pending" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-xl border-green-200 text-green-700 hover:bg-green-50"
              disabled={actingId === requirement.id}
              onClick={() => onApprove(requirement)}
            >
              {actingId === requirement.id ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Approve
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
              disabled={actingId === requirement.id}
              onClick={() => onReject(requirement)}
            >
              <X size={16} /> Reject
            </Button>
          </div>
        )}

        {requirement.submission?.status === "approved" && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-700 ring-1 ring-green-100">
            <CheckCircle2 size={16} /> Approved
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoordinatorInternRequirementsDetailPage() {
  const { uuid } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);
  const [bulkActing, setBulkActing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectAll, setRejectAll] = useState(false);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/coordinator/intern-requirements/${uuid}`)
      .then((res) => setDetail(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [uuid]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(requirement) {
    setActingId(requirement.id);
    try {
      const res = await api.post(`/coordinator/intern-requirements/${uuid}/${requirement.id}/approve`);
      setDetail((prev) => ({
        ...prev,
        requirements: prev.requirements.map((r) =>
          r.id === requirement.id ? { ...r, submission: res.data.data } : r
        ),
      }));
      toast.success("Requirement approved", { description: `${requirement.name} was approved.` });
    } catch (err) {
      toast.error("Approval failed", { description: firstErrorMessage(err) });
    } finally {
      setActingId(null);
    }
  }

  async function confirmReject() {
    if (!rejectTarget || reason.trim().length < 5) return;
    setRejecting(true);
    try {
      const res = await api.post(`/coordinator/intern-requirements/${uuid}/${rejectTarget.id}/reject`, {
        reason: reason.trim(),
      });
      setDetail((prev) => ({
        ...prev,
        requirements: prev.requirements.map((r) =>
          r.id === rejectTarget.id ? { ...r, submission: res.data.data } : r
        ),
      }));
      toast.success("Requirement rejected", { description: `${rejectTarget.name} was rejected.` });
      setRejectTarget(null);
      setReason("");
    } catch (err) {
      toast.error("Rejection failed", { description: firstErrorMessage(err) });
    } finally {
      setRejecting(false);
    }
  }

  const pendingCount = detail?.requirements.filter((r) => r.submission?.status === "pending").length || 0;

  async function handleApproveAll() {
    setBulkActing(true);
    try {
      const res = await api.post(`/coordinator/intern-requirements/${uuid}/approve-all`);
      toast.success("All requirements approved", { description: res.data.data.message });
      load();
    } catch (err) {
      toast.error("Approval failed", { description: firstErrorMessage(err) });
    } finally {
      setBulkActing(false);
    }
  }

  async function confirmRejectAll() {
    if (reason.trim().length < 5) return;
    setRejecting(true);
    try {
      const res = await api.post(`/coordinator/intern-requirements/${uuid}/reject-all`, {
        reason: reason.trim(),
      });
      toast.success("All requirements rejected", { description: res.data.data.message });
      setRejectAll(false);
      setReason("");
      load();
    } catch (err) {
      toast.error("Rejection failed", { description: firstErrorMessage(err) });
    } finally {
      setRejecting(false);
    }
  }

  const preRequirements = detail?.requirements.filter((r) => r.type === "pre_deployment") || [];
  const postRequirements = detail?.requirements.filter((r) => r.type === "post_deployment") || [];
  const preSubmitted = preRequirements.filter((r) => r.submission).length;
  const postSubmitted = postRequirements.filter((r) => r.submission).length;
  const preApproved = preRequirements.filter((r) => r.submission?.status === "approved").length;
  const prePending = preRequirements.filter((r) => r.submission?.status === "pending").length;
  const preRejected = preRequirements.filter((r) => r.submission?.status === "rejected").length;
  const postApproved = postRequirements.filter((r) => r.submission?.status === "approved").length;
  const postPending = postRequirements.filter((r) => r.submission?.status === "pending").length;
  const postRejected = postRequirements.filter((r) => r.submission?.status === "rejected").length;

  const complete = detail && detail.total > 0 && detail.submitted >= detail.total;
  const allApproved =
    detail && detail.total > 0 && preRequirements.every((r) => r.submission?.status === "approved");
  const deployed = ["ongoing", "hours_completed", "completed"].includes(detail?.intern?.ojt_status);
  const postDeploymentApproved =
    postRequirements.length === 0 || postRequirements.every((r) => r.submission?.status === "approved");
  const showComplete = Boolean(
    detail &&
      detail.intern?.ojt_status === "hours_completed" &&
      postDeploymentApproved
  );

  async function handleDeploy() {
    setDeploying(true);
    try {
      await api.post(`/coordinator/intern-requirements/${uuid}/deploy`);
      toast.success("Intern deployed", { description: `${detail?.intern?.full_name} was deployed.` });
      setDeployOpen(false);
      load();
    } catch (err) {
      toast.error("Deployment failed", { description: firstErrorMessage(err) });
    } finally {
      setDeploying(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      await api.post(`/coordinator/intern-requirements/${uuid}/mark-completed`);
      toast.success("Intern marked as completed", {
        description: `${detail?.intern?.full_name} has completed their OJT.`,
      });
      setCompleteOpen(false);
      load();
    } catch (err) {
      toast.error("Action failed", { description: firstErrorMessage(err) });
    } finally {
      setCompleting(false);
    }
  }

  return (
    <CoordinatorLayout>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          className="h-11 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-green-700"
        >
          <Link to="/coordinator/intern-requirements">
            <ArrowLeft size={16} /> Back to interns
          </Link>
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-xl text-green-700">
            <Link to="/coordinator/intern-requirements">Back to interns</Link>
          </Button>
        </div>
      ) : detail ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm ring-1 ring-green-100">
            <div className="flex items-center gap-3 border-b border-green-100/70 bg-gradient-to-r from-green-700 to-green-500 px-4 py-3 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30">
                <UserRound size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-100">Intern</p>
                <p className="truncate font-heading text-base font-bold text-white sm:text-lg">
                  {detail.intern?.full_name}
                </p>
              </div>
              <StatusChip status={detail.intern?.ojt_status || "pending"} />
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
              <DetailRow icon={Mail} label="Email" value={detail.intern?.email} />
              <DetailRow icon={GraduationCap} label="Program" value={detail.intern?.program} />
              <DetailRow icon={Building2} label="Host Training Establishment" value={detail.intern?.hte} />
              <DetailRow
                icon={CalendarDays}
                label="Start date"
                value={detail.intern?.start_date ? formatDate(detail.intern.start_date) : null}
              />
            </div>
            {(pendingCount > 0 || (!deployed && allApproved) || showComplete) && (
              <div className="flex flex-col gap-2 border-t border-green-100/70 bg-green-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs font-semibold text-green-800">
                  {complete
                    ? "All requirements submitted"
                    : `${detail.submitted} of ${detail.total} requirements submitted`}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {pendingCount > 0 && (
                    <>
                      <Button
                        variant="outline"
                        className="h-11 rounded-xl border-green-200 bg-white px-3 text-green-700 hover:bg-green-50"
                        disabled={bulkActing}
                        onClick={handleApproveAll}
                      >
                        {bulkActing ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        Approve all ({pendingCount})
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 rounded-xl border-red-200 bg-white px-3 text-red-600 hover:bg-red-50"
                        disabled={bulkActing}
                        onClick={() => {
                          setReason("");
                          setRejectAll(true);
                        }}
                      >
                        <X size={16} /> Reject all
                      </Button>
                    </>
                  )}
                  {!deployed && allApproved && (
                    <Button
                      className="h-11 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
                      onClick={() => setDeployOpen(true)}
                    >
                      <Rocket size={16} /> Deploy
                    </Button>
                  )}
                  {showComplete && (
                    <Button
                      className="h-11 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
                      onClick={() => setCompleteOpen(true)}
                    >
                      <CheckCircle2 size={16} /> Mark as completed
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            className={`mt-4 grid grid-cols-1 gap-2 ${
              postRequirements.length > 0 ? "sm:grid-cols-2" : "sm:max-w-md"
            } sm:gap-3`}
          >
            <StatusTags
              title="Pre-deployment"
              approved={preApproved}
              pending={prePending}
              rejected={preRejected}
            />
            {postRequirements.length > 0 && (
              <StatusTags
                title="Post-deployment"
                approved={postApproved}
                pending={postPending}
                rejected={postRejected}
              />
            )}
          </div>

          <Accordion
            type="single"
            collapsible
            className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100"
          >
            <AccordionItem value="pre-deployment" className="border-b-0">
              <AccordionTrigger className="px-4 hover:no-underline sm:px-5">
                <span className="flex flex-1 items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
                      <ClipboardList size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Pre-deployment
                      </span>
                      <span className="block truncate font-heading text-sm font-bold text-green-950 sm:text-base">
                        Requirements
                      </span>
                    </span>
                  </span>
                  <Badge className="shrink-0 rounded-full bg-green-50 font-semibold text-green-700 ring-1 ring-green-200">
                    {preSubmitted} / {preRequirements.length} submitted
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent className="border-t border-gray-100 px-4 sm:px-5">
                <div className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-2">
                  {preRequirements.map((requirement) => (
                    <RequirementCard
                      key={requirement.id}
                      requirement={requirement}
                      actingId={actingId}
                      onApprove={handleApprove}
                      onReject={(requirement) => {
                        setReason("");
                        setRejectTarget(requirement);
                      }}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {postRequirements.length > 0 && (
            <Accordion
              type="single"
              collapsible
              className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100"
            >
              <AccordionItem value="post-deployment" className="border-b-0">
                <AccordionTrigger className="px-4 hover:no-underline sm:px-5">
                  <span className="flex flex-1 items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                        <ClipboardCheck size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Post-deployment
                        </span>
                        <span className="block truncate font-heading text-sm font-bold text-green-950 sm:text-base">
                          Requirements
                        </span>
                      </span>
                    </span>
                    <Badge className="shrink-0 rounded-full bg-indigo-50 font-semibold text-indigo-700 ring-1 ring-indigo-200">
                      {postSubmitted} / {postRequirements.length} submitted
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="border-t border-gray-100 px-4 sm:px-5">
                  <div className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-2">
                    {postRequirements.map((requirement) => (
                      <RequirementCard
                        key={requirement.id}
                        requirement={requirement}
actingId={actingId}
                      onApprove={handleApprove}
                      onReject={(requirement) => {
                        setReason("");
                        setRejectTarget(requirement);
                      }}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          )}
          {detail.requirements.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white py-12 text-center shadow-sm ring-1 ring-gray-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <ClipboardList size={20} />
              </div>
              <p className="text-sm font-semibold text-gray-700">No active requirements</p>
              <p className="text-xs text-gray-400">This institute hasn't published any requirements.</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      )}

      <Dialog
        open={Boolean(rejectTarget) || rejectAll}
        onOpenChange={(open) =>
          !open && !rejecting && (setRejectTarget(null), setRejectAll(false))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{rejectAll ? "Reject all requirements?" : "Reject requirement?"}</DialogTitle>
            <DialogDescription>
              {rejectAll ? (
                <>
                  Rejecting all {pendingCount} pending submissions will notify the intern to resubmit corrected
                  PDFs. Provide a reason.
                </>
              ) : (
                <>
                  Rejecting <span className="font-semibold text-gray-800">{rejectTarget?.name}</span> will notify the
                  intern to resubmit a corrected PDF. Provide a reason.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Document is not notarized…"
            className="min-h-28 rounded-xl"
          />
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => {
                setRejectTarget(null);
                setRejectAll(false);
              }}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-11 rounded-xl"
              disabled={rejecting || reason.trim().length < 5}
              onClick={rejectAll ? confirmRejectAll : confirmReject}
            >
              {rejecting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Rejecting…
                </>
              ) : (
                <>
                  <X size={16} /> {rejectAll ? "Reject all" : "Reject requirement"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deployOpen} onOpenChange={(open) => !open && !deploying && setDeployOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deploy {detail?.intern?.full_name}?</DialogTitle>
            <DialogDescription>
              All pre-deployment requirements are approved. Confirm to mark the intern as deployed
              {detail?.intern?.hte ? ` to ${detail.intern.hte}` : ""} starting today, and update their record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => setDeployOpen(false)}
              disabled={deploying}
            >
              Cancel
            </Button>
            <Button
              className="h-11 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
              disabled={deploying}
              onClick={handleDeploy}
            >
              {deploying ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Deploying…
                </>
              ) : (
                <>
                  <Rocket size={16} /> Confirm deployment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={(open) => !open && !completing && setCompleteOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark {detail?.intern?.full_name} as completed?</DialogTitle>
            <DialogDescription>
              All {detail?.requirements.length} of {detail?.requirements.length} requirements are approved.
              Confirm to mark this intern's OJT as completed and finalize their records.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <DialogInfo icon={GraduationCap} label="Program" value={detail?.intern?.program} />
            <DialogInfo
              icon={Building2}
              label="Host training establishment"
              value={detail?.intern?.hte}
            />
            <DialogInfo
              icon={CalendarDays}
              label="Start date"
              value={detail?.intern?.start_date ? formatDate(detail.intern.start_date) : null}
            />
            <DialogInfo
              icon={CalendarCheck2}
              label="End date"
              value={detail?.intern?.end_date ? formatDate(detail.intern.end_date) : null}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-green-100 bg-green-50/60 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-green-100 text-green-700 ring-1 ring-green-100">
                <Clock3 size={12} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">
                  Total OJT hours (checked only)
                </p>
                <p className="text-[10px] text-green-600/80">Instructor-checked photo DTRs</p>
              </div>
            </div>
            <p className="shrink-0 font-heading text-sm font-bold text-green-800">
              {formatMinutes(detail?.intern?.earned_minutes)}
            </p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">What happens after</p>
            <ul className="mt-2 space-y-1.5">
              <li className="flex items-start gap-2 text-xs text-gray-600">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-600" />
                <span>
                  The intern's status changes to{" "}
                  <span className="font-semibold text-gray-800">Completed</span> and they receive a
                  notification.
                </span>
              </li>
              <li className="flex items-start gap-2 text-xs text-gray-600">
                <Lock size={14} className="mt-0.5 shrink-0 text-green-600" />
                <span>Their journals and photo DTR are locked as read-only.</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-gray-600">
                <Info size={14} className="mt-0.5 shrink-0 text-green-600" />
                <span>This action finalizes the intern's OJT record.</span>
              </li>
            </ul>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => setCompleteOpen(false)}
              disabled={completing}
            >
              Cancel
            </Button>
            <Button
              className="h-11 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
              disabled={completing}
              onClick={handleComplete}
            >
              {completing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Completing…
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Confirm completion
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoordinatorLayout>
  );
}
