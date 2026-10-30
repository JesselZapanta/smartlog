import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Loader2,
  UserRound,
} from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import TransferStatusChip from "@/components/TransferStatusChip.jsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import PageLoader from "@/components/PageLoader";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TimelineRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3.5 py-2.5">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-700">{formatDate(value)}</span>
    </div>
  );
}

function DirectionBlock({ title, subtitle, progress }) {
  const total = progress?.total ?? 0;
  const answered = progress?.answered ?? 0;
  const percent = total > 0 ? Math.round((answered / total) * 100) : 100;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        {progress?.complete ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700 ring-1 ring-green-200">
            <CheckCircle2 size={11} /> Complete
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
            In progress
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
      <div className="mt-2.5 flex items-center gap-3">
        <Progress value={percent} className="h-2 flex-1" />
        <span className="shrink-0 font-mono text-xs font-bold text-gray-600">
          {answered}/{total}
        </span>
      </div>
    </div>
  );
}

export default function TransferDetailDialog({ open, onOpenChange, transferUuid, onReassigned }) {
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [htes, setHtes] = useState([]);
  const [toHteId, setToHteId] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const load = useCallback(async () => {
    if (!transferUuid) return;
    setLoading(true);
    try {
      const res = await api.get(`/coordinator/transfer-requests/${transferUuid}`);
      setTransfer(res.data.data);
    } catch (err) {
      toast.error("Failed to load transfer", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [transferUuid]);

  useEffect(() => {
    if (!open) return;
    setTransfer(null);
    setToHteId("");
    load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    api
      .get("/coordinator/htes", { params: { per_page: 100 } })
      .then((res) => setHtes(res.data.data || []))
      .catch(() => {});
  }, [open]);

  async function reassign() {
    if (!toHteId || reassigning) return;
    setReassigning(true);
    try {
      await api.post(`/coordinator/transfer-requests/${transferUuid}/reassign`, {
        to_hte_id: Number(toHteId),
      });
      toast.success("Intern reassigned", {
        description: "The intern must submit requirements and be re-deployed at the new host.",
      });
      onReassigned();
      await load();
    } catch (err) {
      toast.error("Reassignment failed", { description: firstErrorMessage(err) });
    } finally {
      setReassigning(false);
    }
  }

  const activeHtes = htes.filter(
    (hte) => hte.status === "active" && hte.id !== transfer?.from_hte?.id
  );
  const selectedHte = activeHtes.find((hte) => String(hte.id) === toHteId);
  const programMismatch =
    selectedHte && transfer?.from_hte?.program_id
      ? selectedHte.program_id !== transfer.from_hte.program_id
      : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-700 to-green-500 text-white shadow-md shadow-green-600/25">
              <ArrowLeftRight size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl text-gray-900">Transfer Details</DialogTitle>
              <DialogDescription className="text-sm">
                Review the evaluations, then reassign the intern to a new host.
              </DialogDescription>
            </div>
            {transfer && <TransferStatusChip status={transfer.status} />}
          </div>
        </DialogHeader>

        {loading ? (
          <PageLoader />
        ) : !transfer ? (
          <p className="py-8 text-center text-sm text-gray-500">Transfer not found.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
                  <UserRound size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{transfer.intern?.name || "Unknown intern"}</p>
                  <p className="truncate text-xs text-gray-400">
                    {transfer.intern?.program || "—"}
                    {transfer.intern?.institute ? ` · ${transfer.intern.institute}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-600">
                  {transfer.intern?.ojt_status || "—"}
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-2 rounded-xl bg-gray-50 px-3.5 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Building2 size={15} className="shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">From</p>
                    <p className="truncate text-sm font-semibold text-gray-700">{transfer.from_hte?.name || "—"}</p>
                  </div>
                </div>
                <ArrowRight size={16} className="hidden shrink-0 text-gray-300 sm:block" />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Building2 size={15} className="shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">To</p>
                    <p className="truncate text-sm font-semibold text-gray-700">
                      {transfer.to_hte?.name || "Not assigned yet"}
                    </p>
                  </div>
                </div>
              </div>

              {transfer.reason && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-100">
                  {transfer.reason}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <CalendarDays size={13} className="text-green-600" /> Timeline
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <TimelineRow label="Requested" value={transfer.created_at} />
                <TimelineRow label="Accepted" value={transfer.accepted_at} />
                <TimelineRow label="Evaluated" value={transfer.evaluated_at} />
                <TimelineRow label="Reassigned" value={transfer.reassigned_at} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Evaluation progress</p>
              <DirectionBlock
                title="HTE evaluated the intern"
                subtitle={`${transfer.from_hte?.name || "The outgoing HTE"} rates the intern's performance.`}
                progress={transfer.evaluation_progress?.intern}
              />
              <DirectionBlock
                title="Intern evaluated the HTE"
                subtitle={`The intern rates ${transfer.from_hte?.name || "the outgoing HTE"}.`}
                progress={transfer.evaluation_progress?.hte}
              />
            </div>

            {transfer.status === "evaluated" && (
              <div className="space-y-3 rounded-2xl border border-green-100 bg-green-50/60 p-4 ring-1 ring-green-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <p className="text-sm font-bold text-green-900">Ready to reassign</p>
                </div>
                <Select value={toHteId} onValueChange={setToHteId}>
                  <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl bg-white">
                    <SelectValue placeholder="Select the new host establishment" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeHtes.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-gray-400">
                        No other active host establishments available.
                      </div>
                    ) : (
                      activeHtes.map((hte) => (
                        <SelectItem key={hte.id} value={String(hte.id)}>
                          {hte.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {programMismatch && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                    <p className="text-xs leading-relaxed text-amber-800">
                      This host&apos;s program differs from the outgoing one. Requirements and evaluation criteria come
                      from the intern&apos;s institute, so this only affects where they complete the OJT.
                    </p>
                  </div>
                )}

                <Button
                  className="h-11 w-full rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
                  onClick={reassign}
                  disabled={!toHteId || reassigning}
                >
                  {reassigning ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Reassigning...
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight size={16} /> Reassign intern
                    </>
                  )}
                </Button>
                <p className="text-xs leading-relaxed text-green-800/80">
                  The intern returns to <span className="font-semibold">pending</span> status — they must submit the new
                  host&apos;s requirements and be re-deployed before logging hours again.
                </p>
              </div>
            )}

            {transfer.status === "reassigned" && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-green-50 p-4 ring-1 ring-green-200">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
                <p className="text-sm leading-relaxed text-green-900">
                  This transfer is complete. The intern was reassigned to{" "}
                  <span className="font-semibold">{transfer.to_hte?.name || "the new host"}</span> and must be re-deployed
                  after their new requirements are approved.
                </p>
              </div>
            )}

            {["requested", "accepted"].includes(transfer.status) && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-sky-600" />
                <p className="text-sm leading-relaxed text-sky-800">
                  {transfer.status === "requested"
                    ? `Waiting for ${transfer.from_hte?.name || "the host"} to accept the request.`
                    : "Both the host and the intern must finish evaluating the closing placement before you can reassign."}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
