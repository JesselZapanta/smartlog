import { useCallback, useEffect, useState } from "react";
import {
  Users,
  GraduationCap,
  Store,
  BookOpen,
  Loader2,
  ShieldAlert,
  Building2,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import DashboardBanner from "@/components/DashboardBanner.jsx";
import StatCard from "@/components/StatCard.jsx";
import SectionCard from "@/components/SectionCard.jsx";
import InternsTable from "@/components/InternsTable.jsx";
import StatusChip from "@/components/StatusChip.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function CoordinatorDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);
  const [actionBusy, setActionBusy] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/dashboard")
      .then((res) => setData(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approveIntern(intern) {
    setActionBusy(intern.uuid);
    try {
      await api.post(`/registrations/${intern.uuid}/approve`);
      toast.success("Registration approved", { description: `${intern.full_name} can now use SMARTLOG.` });
      load();
    } catch (err) {
      toast.error("Approval failed", { description: firstErrorMessage(err) });
    } finally {
      setActionBusy("");
    }
  }

  async function confirmReject() {
    if (!rejectTarget || reason.trim().length < 5) return;
    setActing(true);
    try {
      await api.post(`/registrations/${rejectTarget.uuid}/reject`, { reason: reason.trim() });
      toast.success("Registration rejected", { description: `${rejectTarget.full_name} was notified of the reason.` });
      setRejectTarget(null);
      setReason("");
      load();
    } catch (err) {
      toast.error("Rejection failed", { description: firstErrorMessage(err) });
    } finally {
      setActing(false);
    }
  }

  const pending = data?.pending_approvals || [];

  return (
    <CoordinatorLayout>
      <DashboardBanner
        roleLabel="COORDINATOR"
        subtitle="Approve intern registrations for your institute and keep host training establishments on track."
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-600">{error}</p>
      ) : (
        <>
          <SectionCard
            title="Pending Approvals"
            subtitle={pending.length > 0 ? `Interns waiting for your decision — ${pending.length}` : "No interns waiting for approval"}
            action={<ShieldAlert size={18} className="text-gray-300" />}
          >
            {pending.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                All caught up! New intern registrations for your institute will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {pending.map((intern) => (
                  <div
                    key={intern.uuid}
                    className="flex flex-col gap-3 rounded-2xl bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                          {getInitials(intern.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{intern.full_name}</p>
                        <p className="truncate text-xs text-gray-400">{intern.email}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {intern.program || "—"}
                          {intern.created_at
                            ? ` · Registered ${new Date(intern.created_at).toLocaleDateString("en-US")}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        className="h-11 flex-1 gap-1.5 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex-none"
                        onClick={() => approveIntern(intern)}
                        disabled={Boolean(actionBusy)}
                      >
                        {actionBusy === intern.uuid ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 flex-1 gap-1.5 rounded-xl border-red-200 font-semibold text-red-600 hover:bg-red-50 sm:flex-none"
                        onClick={() => {
                          setRejectTarget(intern);
                          setReason("");
                        }}
                        disabled={Boolean(actionBusy)}
                      >
                        <X size={16} />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Interns" value={data.stats.interns} helper="Registered accounts" icon={<Users size={20} />} tone="blue" />
            <StatCard label="Verified Interns" value={data.stats.verified_interns} helper={`${data.stats.interns - data.stats.verified_interns} pending email OTP`} icon={<ShieldAlert size={20} />} tone="green" />
            <StatCard label="Host Training Est." value={data.stats.htes} helper="Partner organizations" icon={<Store size={20} />} tone="emerald" />
            <StatCard label="Programs" value={data.stats.programs} helper="Available programs" icon={<BookOpen size={20} />} tone="amber" />
          </section>

          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionCard
                title="Recent Interns"
                subtitle="Latest registrations and verification status"
                action={<GraduationCap size={18} className="text-gray-300" />}
              >
                <InternsTable rows={data.recent_interns} />
              </SectionCard>
            </div>

            <SectionCard
              title="HTE Partnerships"
              subtitle="Current host training establishments"
              action={<Building2 size={18} className="text-gray-300" />}
            >
              {data.htes.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No HTE records yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.htes.map((hte) => (
                    <div key={hte.uuid} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                          <Store size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-700">{hte.name}</p>
                          <p className="truncate text-xs text-gray-400">
                            {hte.program || "—"}
                            {hte.institute ? ` · ${hte.institute}` : ""}
                          </p>
                        </div>
                      </div>
                      <StatusChip status={hte.status} />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </section>
        </>
      )}

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && !acting && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject registration</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `Reject ${rejectTarget.full_name}'s registration? The intern will see this reason and can resubmit.`
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
              onClick={() => setRejectTarget(null)}
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