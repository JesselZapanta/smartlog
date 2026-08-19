import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Check, X, Loader2, CalendarDays, ClipboardCheck, AlertTriangle } from "lucide-react";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PageLoader from "@/components/PageLoader";
import InternDetailView from "@/components/InternDetailView.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export default function RegistrationApprovalDetailPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/registrations/${uuid}`)
      .then((res) => setRegistration(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [uuid]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve() {
    if (!registration) return;
    setActing(true);
    try {
      await api.post(`/registrations/${registration.uuid}/approve`);
      toast.success("Registration approved", { description: `${registration.full_name} can now use SMARTLOG.` });
      navigate("/coordinator/registrations");
    } catch (err) {
      toast.error("Approval failed", { description: firstErrorMessage(err) });
    } finally {
      setActing(false);
    }
  }

  async function confirmReject() {
    if (!registration || reason.trim().length < 5) return;
    setActing(true);
    try {
      await api.post(`/registrations/${registration.uuid}/reject`, { reason: reason.trim() });
      toast.success("Registration rejected", { description: `${registration.full_name} was notified of the reason.` });
      navigate("/coordinator/registrations");
    } catch (err) {
      toast.error("Rejection failed", { description: firstErrorMessage(err) });
    } finally {
      setActing(false);
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
          <Link to="/coordinator/registrations">
            <ArrowLeft size={16} /> Back to registrations
          </Link>
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-xl text-green-700">
            <Link to="/coordinator/registrations">Back to registrations</Link>
          </Button>
        </div>
      ) : registration ? (
        <>
          <InternDetailView intern={registration} />

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            {registration.status === "pending" ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ClipboardCheck size={16} className="shrink-0 text-green-600" />
                  <p>
                    Approve to activate <span className="font-semibold text-gray-700">{registration.full_name}</span>
                    {"'"}s account, or reject with a reason they can act on.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    className="h-11 flex-1 gap-1.5 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex-none"
                    onClick={approve}
                    disabled={acting}
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
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CalendarDays size={16} className="shrink-0 text-gray-300" />
                <p>
                  This registration was already{" "}
                  <span className="font-semibold lowercase text-gray-700">{registration.status}</span>
                  {registration.reviewed_at ? ` on ${formatDateTime(registration.reviewed_at)}` : ""} by{" "}
                  {registration.reviewed_by || "a coordinator"}.
                </p>
              </div>
            )}
          </div>
        </>
      ) : null}

      <Dialog open={rejectOpen} onOpenChange={(open) => !open && !acting && setRejectOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject registration</DialogTitle>
            <DialogDescription>
              {registration
                ? `Reject ${registration.full_name}'s registration? The intern will see this reason and can resubmit.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => setRejectOpen(false)}
              disabled={acting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-11 rounded-xl"
              onClick={confirmReject}
              disabled={acting || reason.trim().length < 5}
            >
              {acting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Rejecting…
                </>
              ) : (
                <>
                  <X size={16} /> Reject registration
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoordinatorLayout>
  );
}
