import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  School,
  CalendarDays,
  UserRound,
  Users,
  MapPin,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PageLoader from "@/components/PageLoader";
import StatusChip from "@/components/StatusChip.jsx";
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

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className={`min-w-0 text-sm text-gray-800 ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50 text-green-700">
          <Icon size={16} />
        </div>
        <h2 className="font-heading text-sm font-bold text-green-950">{title}</h2>
      </div>
      <dl className="space-y-3">{children}</dl>
    </div>
  );
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

  const location = registration?.location;

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
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-14 w-14 shrink-0">
                  {registration.profile_picture && (
                    <AvatarImage src={registration.profile_picture} alt={registration.full_name} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-base font-bold text-white">
                    {getInitials(registration.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="truncate font-heading text-xl font-bold text-green-950 sm:text-2xl">
                    {registration.full_name}
                  </h1>
                  <p className="truncate text-sm text-gray-500">{registration.email}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                    <span className="font-mono">#{registration.id}</span>
                    <span>Registered {formatDate(registration.created_at)}</span>
                  </p>
                </div>
              </div>
              <StatusChip status={registration.status} />
            </div>

            {registration.status === "rejected" && registration.rejection_reason && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">Rejection reason</p>
                  <p className="mt-0.5 text-sm text-red-800">{registration.rejection_reason}</p>
                </div>
              </div>
            )}

            {registration.status === "approved" && registration.reviewed_by && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-green-50 p-3 ring-1 ring-green-100">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-green-700" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-700">Approved by {registration.reviewed_by}</p>
                  <p className="mt-0.5 text-sm text-green-800">Reviewed on {formatDateTime(registration.reviewed_at)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <InfoCard icon={School} title="Placement">
              <InfoRow label="Institute" value={registration.institute} />
              <InfoRow label="Program" value={registration.program} />
              <InfoRow label="Academic Year" value={registration.academic_year} />
              <InfoRow label="Practicum Instructor" value={registration.practicum_instructor} />
              <InfoRow
                label="Certificate of Registration"
                value={
                  registration.cor ? (
                    <a
                      href={registration.cor}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-green-700 hover:underline"
                    >
                      <FileText size={14} /> Open PDF
                    </a>
                  ) : null
                }
              />
            </InfoCard>

            <InfoCard icon={UserRound} title="Personal Information">
              <InfoRow label="Date of Birth" value={formatDate(registration.date_of_birth)} />
              <InfoRow label="Place of Birth" value={registration.place_of_birth} />
              <InfoRow label="Contact Number" value={registration.contact_number} mono />
            </InfoCard>

            <InfoCard icon={Users} title="Parents / Guardian">
              <InfoRow label="Father" value={registration.fathers_name} />
              <InfoRow label="Father's Occupation" value={registration.fathers_occupation} />
              <InfoRow label="Father's Contact" value={registration.fathers_contact} mono />
              <InfoRow label="Mother" value={registration.mothers_name} />
              <InfoRow label="Mother's Occupation" value={registration.mothers_occupation} />
              <InfoRow label="Mother's Contact" value={registration.mothers_contact} mono />
              <InfoRow label="Guardian Address" value={registration.parents_guardian_address} />
            </InfoCard>

            <InfoCard icon={MapPin} title="Address">
              <InfoRow label="Region" value={location?.region} />
              <InfoRow label="Province" value={location?.province} />
              <InfoRow label="City / Municipality" value={location?.city_municipality} />
              <InfoRow label="Barangay" value={location?.barangay} />
            </InfoCard>
          </div>

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