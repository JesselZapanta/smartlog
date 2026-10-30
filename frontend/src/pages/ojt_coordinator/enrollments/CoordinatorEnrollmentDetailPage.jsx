import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PageLoader from "@/components/PageLoader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const REQUIRED_LABELS = {
  cor: "New COR",
  curriculum: "Curriculum",
  ojt_hours: "OJT hours",
};

function StatusBadge({ status }) {
  const map = {
    pending: { label: "Pending review", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
    approved: { label: "Approved", className: "bg-green-50 text-green-700 ring-1 ring-green-200" },
    rejected: { label: "Rejected", className: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  };
  const tone = map[status] || map.pending;
  return <Badge className={`rounded-full font-semibold ${tone.className}`}>{tone.label}</Badge>;
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-gray-800">{value || "—"}</p>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CoordinatorEnrollmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [hoursInput, setHoursInput] = useState("");
  const [savingHours, setSavingHours] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get(`/coordinator/enrollments/${id}`)
      .then((res) => setApplication(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setHoursInput(application?.ojt_hours != null ? String(application.ojt_hours) : "");
  }, [application?.id, application?.ojt_hours]);

  function openHours() {
    if (!application) return;
    setHoursInput(application.ojt_hours != null ? String(application.ojt_hours) : "");
    setHoursOpen(true);
  }

  async function saveHours() {
    if (!application) return;
    const nextHours = Number(hoursInput);
    if (
      hoursInput === "" ||
      !Number.isInteger(nextHours) ||
      nextHours < 1 ||
      nextHours > 10000
    ) {
      toast.error("Invalid hours", {
        description: "Enter a whole number from 1 to 10,000.",
      });
      return;
    }

    setSavingHours(true);
    try {
      const res = await api.patch(`/coordinator/enrollments/${application.id}/ojt-hours`, {
        ojt_hours: nextHours,
      });
      setApplication(res.data.data);
      setHoursOpen(false);
      toast.success(res.data.message || "OJT hours updated", {
        description: `${application.student_name} now shows ${nextHours} hours.`,
      });
    } catch (err) {
      toast.error("Could not update hours", { description: firstErrorMessage(err) });
    } finally {
      setSavingHours(false);
    }
  }

  async function approve() {
    if (!application) return;
    setActing(true);
    try {
      await api.post(`/coordinator/enrollments/${application.id}/approve`);
      toast.success("Application approved", {
        description: `${application.student_name} is now enrolled for ${application.academic_year}.`,
      });
      navigate("/coordinator/enrollments");
    } catch (err) {
      toast.error("Approval failed", { description: firstErrorMessage(err) });
    } finally {
      setActing(false);
    }
  }

  async function confirmReject() {
    if (!application || reason.trim().length < 5) return;
    setActing(true);
    try {
      await api.post(`/coordinator/enrollments/${application.id}/reject`, {
        reason: reason.trim(),
      });
      toast.success("Application rejected", {
        description: `${application.student_name} was notified of the reason.`,
      });
      navigate("/coordinator/enrollments");
    } catch (err) {
      toast.error("Rejection failed", { description: firstErrorMessage(err) });
    } finally {
      setActing(false);
    }
  }

  const documents = application?.documents || [];
  const missing = application?.missing_requirements || [];
  const parsedHours = Number(hoursInput);
  const hoursValid =
    hoursInput !== "" && Number.isInteger(parsedHours) && parsedHours >= 1 && parsedHours <= 10000;
  const hoursDirty = hoursValid && parsedHours !== Number(application?.ojt_hours ?? 0);
  const canEditHours =
    application?.status === "pending" || application?.status === "rejected";

  return (
    <CoordinatorLayout>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          className="h-11 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-green-700"
        >
          <Link to="/coordinator/enrollments">
            <ArrowLeft size={16} /> Back to enrollments
          </Link>
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-xl text-green-700">
            <Link to="/coordinator/enrollments">Back to enrollments</Link>
          </Button>
        </div>
      ) : application ? (
        <>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Enrollment application
                </p>
                <h1 className="mt-1 break-words font-heading text-xl font-bold text-gray-900 sm:text-2xl">
                  {application.student_name}
                </h1>
                <p className="mt-1 break-words text-sm text-gray-500">{application.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={application.status} />
                {application.intern_passed && (
                  <Badge className="gap-1 rounded-full bg-green-50 font-semibold text-green-700 ring-1 ring-green-200">
                    <GraduationCap size={11} />
                    OJT passed
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Academic term" value={application.academic_year} />
              <DetailItem label="Program" value={application.program} />
              <DetailItem label="Institute" value={application.institute} />
              <DetailItem
                label="OJT hours"
                value={application.ojt_hours ? `${application.ojt_hours} hours` : "Not submitted"}
              />
              <DetailItem label="Reviewed by" value={application.reviewed_by} />
              <DetailItem label="Reviewed at" value={formatDateTime(application.reviewed_at)} />
            </div>

            {application.status === "rejected" && application.rejection_reason && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50/60 p-3 ring-1 ring-red-100">
                <X size={16} className="mt-0.5 shrink-0 text-red-600" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Reason</p>
                  <p className="mt-0.5 break-words text-sm text-red-800">
                    {application.rejection_reason}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            <div className="flex items-center gap-2">
              <ClipboardList size={15} className="text-green-600" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Requirements ({Object.keys(REQUIRED_LABELS).length - missing.length} of {Object.keys(REQUIRED_LABELS).length})
              </p>
            </div>

            {missing.length > 0 ? (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 p-3 ring-1 ring-amber-100">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Still outstanding:{" "}
                  {missing.map((key) => REQUIRED_LABELS[key] || key).join(", ")}.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-green-700">
                All required items are submitted.
              </p>
            )}

            <ul className="mt-3 space-y-2">
              {documents.map((document) => (
                <li
                  key={document.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText size={15} className="shrink-0 text-gray-500" />
                    <div className="min-w-0">
                      <p className="truncate">{document.label}</p>
                      <p className="text-xs text-gray-400">
                        {REQUIRED_LABELS[document.type] || document.type}
                      </p>
                    </div>
                  </div>
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${document.label}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-green-700 hover:bg-green-50"
                  >
                    <ExternalLink size={16} />
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Clock3 size={15} className="shrink-0 text-gray-500" />
                <p className="truncate text-sm font-semibold text-gray-800">
                  {application.ojt_hours ? `${application.ojt_hours} hours` : "OJT hours not submitted"}
                </p>
              </div>
              {canEditHours && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openHours}
                  disabled={savingHours}
                  aria-label="Edit OJT hours"
                  title="Edit OJT hours"
                  className="h-10 w-10 shrink-0 rounded-xl text-gray-500 hover:bg-green-50 hover:text-green-700"
                >
                  <Pencil size={16} />
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            {application.status === "pending" ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Approve to enroll{" "}
                  <span className="font-semibold text-gray-700">{application.student_name}</span>{" "}
                  for <span className="font-semibold text-gray-700">{application.academic_year}</span>.
                  Their program and institute carry over, and records from earlier terms are kept.
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button
                    className="h-11 flex-1 gap-1.5 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 disabled:opacity-50 sm:flex-none"
                    onClick={() => setApproveOpen(true)}
                    disabled={acting || application.intern_passed}
                    title={
                      application.intern_passed
                        ? "This intern has already passed their OJT and cannot be enrolled again."
                        : undefined
                    }
                  >
                    {acting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 flex-1 gap-1.5 rounded-xl border-red-200 font-semibold text-red-600 hover:bg-red-50 sm:flex-none"
                    onClick={() => {
                      setReason("");
                      setRejectOpen(true);
                    }}
                    disabled={acting}
                  >
                    <X size={16} />
                    Reject
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                This application was already{" "}
                <span className="font-semibold lowercase text-gray-700">{application.status}</span>
                {application.reviewed_at ? ` on ${formatDateTime(application.reviewed_at)}` : ""} by{" "}
                {application.reviewed_by || "a coordinator"}.
              </p>
            )}
          </div>
        </>
      ) : null}

      <Dialog open={approveOpen} onOpenChange={(open) => !open && !acting && setApproveOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve application</DialogTitle>
            <DialogDescription>
              {application
                ? `Approve ${application.student_name}'s enrollment for ${application.academic_year}? Their program and institute carry over, and records from earlier terms are kept.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-xl sm:flex-initial"
              onClick={() => setApproveOpen(false)}
              disabled={acting}
            >
              Cancel
            </Button>
            <Button
              className="h-11 flex-1 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex-initial"
              onClick={approve}
              disabled={acting || application?.intern_passed}
            >
              {acting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Approving...
                </>
              ) : (
                <>
                  <Check size={16} /> Approve application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={(open) => !open && !acting && setRejectOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>
              {application
                ? `Reject ${application.student_name}'s enrollment for ${application.academic_year}? The intern will see this reason and can resubmit.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Tell the intern what needs to be fixed (at least 5 characters)"
              rows={4}
              className="min-h-24 rounded-xl"
            />
            {reason.trim().length > 0 && reason.trim().length < 5 && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertTriangle size={13} /> Reason must be at least 5 characters.
              </p>
            )}
          </div>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-xl sm:flex-initial"
              onClick={() => setRejectOpen(false)}
              disabled={acting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-11 flex-1 rounded-xl sm:flex-initial"
              onClick={confirmReject}
              disabled={acting || reason.trim().length < 5}
            >
              {acting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Rejecting...
                </>
              ) : (
                <>
                  <X size={16} /> Reject application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hoursOpen} onOpenChange={(open) => !open && !savingHours && setHoursOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit OJT hours</DialogTitle>
            <DialogDescription>
              {application
                ? `Update the declared hours for ${application.student_name} for ${application.academic_year}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              max="10000"
              value={hoursInput}
              onChange={(event) => setHoursInput(event.target.value)}
              placeholder="0"
              disabled={savingHours}
              aria-label="OJT hours"
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-gray-500">Enter a whole number from 1 to 10,000.</p>
          </div>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-xl sm:flex-initial"
              onClick={() => setHoursOpen(false)}
              disabled={savingHours}
            >
              Cancel
            </Button>
            <Button
              className="h-11 flex-1 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex-initial"
              onClick={saveHours}
              disabled={savingHours || !hoursDirty}
            >
              {savingHours ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                "Save hours"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoordinatorLayout>
  );
}
