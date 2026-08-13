import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, ClipboardList, CheckCircle2, Clock3, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { typeLabel, typeTone } from "@/pages/admin/requirements/constants.js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  const complete = detail && detail.total > 0 && detail.submitted >= detail.total;

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
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32 rounded-lg" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
                <Skeleton className="mt-3 h-3 w-3/4" />
                <Skeleton className="mt-4 h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-xl text-green-700">
            <Link to="/coordinator/intern-requirements">Back to interns</Link>
          </Button>
        </div>
      ) : detail ? (
        <>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-14 w-14 shrink-0">
                  {detail.intern?.profile_picture && <AvatarImage src={detail.intern.profile_picture} alt={detail.intern.full_name} />}
                  <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-base font-bold text-white">
                    {getInitials(detail.intern?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="truncate font-heading text-xl font-bold text-green-950 sm:text-2xl">
                    {detail.intern?.full_name}
                  </h1>
                  <p className="truncate text-sm text-gray-500">{detail.intern?.email}</p>
                  {detail.intern?.program && (
                    <p className="mt-0.5 text-xs text-gray-400">{detail.intern.program}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <div className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                  {complete ? (
                    <CheckCircle2 size={18} className="text-green-600" />
                  ) : (
                    <Clock3 size={18} className="text-amber-500" />
                  )}
                  <span className="text-sm font-semibold text-gray-700">
                    {detail.submitted}/{detail.total} submitted
                  </span>
                </div>
                {pendingCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl border-green-200 px-3 text-green-700 hover:bg-green-50"
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
                      className="h-11 rounded-xl border-red-200 px-3 text-red-600 hover:bg-red-50"
                      disabled={bulkActing}
                      onClick={() => {
                        setReason("");
                        setRejectAll(true);
                      }}
                    >
                      <X size={16} /> Reject all
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {detail.requirements.map((requirement) => (
              <div key={requirement.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-100">
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
                        onClick={() => handleApprove(requirement)}
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
                        onClick={() => {
                          setReason("");
                          setRejectTarget(requirement);
                        }}
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
            ))}
          </div>
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
    </CoordinatorLayout>
  );
}
