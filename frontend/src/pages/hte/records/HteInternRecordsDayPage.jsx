import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BookOpenText, ChevronLeft, ChevronRight, Clock3, Flag, Loader2, NotebookPen, ShieldCheck } from "lucide-react";
import HteLayout from "@/layouts/HteLayout.jsx";
import StatusChip from "@/components/StatusChip.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import PageLoader from "@/components/PageLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SLOTS = [
  { key: "am_in", label: "AM In" },
  { key: "am_out", label: "AM Out" },
  { key: "pm_in", label: "PM In" },
  { key: "pm_out", label: "PM Out" },
];

const JOURNAL_STATUS = {
  pending: { badge: "bg-amber-50 text-amber-700 ring-amber-200", label: "Pending" },
  approved: { badge: "bg-green-50 text-green-700 ring-green-200", label: "Approved" },
  verified: { badge: "bg-green-50 text-green-700 ring-green-200", label: "Verified" },
  checked: { badge: "bg-indigo-50 text-indigo-700 ring-indigo-200", label: "Checked" },
  flagged: { badge: "bg-red-50 text-red-700 ring-red-200", label: "Flagged" },
};

function formatTime(value) {
  if (!value) return "—";
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function computeDuration(slots) {
  const toMinutes = (time) => {
    if (!time) return null;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };
  let total = 0;
  for (const [inKey, outKey] of [
    ["am_in", "am_out"],
    ["pm_in", "pm_out"],
  ]) {
    const start = toMinutes(slots?.[inKey]?.time);
    const end = toMinutes(slots?.[outKey]?.time);
    if (start != null && end != null && end > start) {
      total += end - start;
    }
  }
  if (total <= 0) return null;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

function pairDuration(slots, inKey, outKey) {
  const toMinutes = (time) => {
    if (!time) return null;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const start = toMinutes(slots?.[inKey]?.time);
  const end = toMinutes(slots?.[outKey]?.time);
  if (start == null || end == null || end <= start) return null;
  const diff = end - start;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
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

function shiftDate(ymd, days) {
  const date = new Date(`${ymd}T00:00:00`);
  date.setDate(date.getDate() + days);
  return format(date, "yyyy-MM-dd");
}

function recordStatusText(status) {
  if (status === "verified") return "Verified";
  if (status === "flagged") return "Already flagged";
  return "Pending";
}

function RecordCheckRow({ title, checked, disabled, statusText, onCheckedChange }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-xl border p-3.5",
        disabled ? "border-gray-100 bg-gray-50/50 opacity-50" : "border-gray-200 bg-white"
      )}
    >
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
      <span className="text-sm font-semibold text-gray-700">
        {title}
        {statusText && <span className="ml-2 text-xs font-normal text-gray-400">{statusText}</span>}
      </span>
    </label>
  );
}

export default function HteInternRecordsDayPage() {
  const { uuid, date: dateParam } = useParams();
  const navigate = useNavigate();
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const [intern, setIntern] = useState(null);
  const [dtr, setDtr] = useState(null);
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [remarks, setRemarks] = useState("");
  const [reviewing, setReviewing] = useState(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyDtr, setVerifyDtr] = useState(false);
  const [verifyJournal, setVerifyJournal] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagDtr, setFlagDtr] = useState(false);
  const [flagJournal, setFlagJournal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [internRes, recordsRes] = await Promise.all([
        api.get(`/hte/interns/${uuid}`),
        api.get(`/hte/interns/${uuid}/records?date=${dateParam}`),
      ]);
      setIntern(internRes.data.data);
      setDtr(recordsRes.data.dtr || null);
      setJournal(recordsRes.data.data || null);
    } catch (err) {
      setError(firstErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [uuid, dateParam]);

  useEffect(() => {
    load();
  }, [load]);

  const duration = dtr ? computeDuration(dtr.slots) : null;
  const prettyDate = format(new Date(`${dateParam}T00:00:00`), "EEEE, MMMM d, yyyy");
  const prevDay = shiftDate(dateParam, -1);
  const nextDay = shiftDate(dateParam, 1);
  const isToday = dateParam === todayKey;

  function goToDay(ymd) {
    navigate(`/hte/records/${uuid}/${ymd}`);
  }

  function openVerifyDialog() {
    setVerifyDtr(Boolean(dtr && dtr.status !== "verified"));
    setVerifyJournal(Boolean(journal && journal.status !== "verified"));
    setVerifyOpen(true);
  }

  async function confirmVerify() {
    if (reviewing) return;
    const targets = [];
    if (verifyDtr && dtr && dtr.status !== "verified") targets.push("dtr");
    if (verifyJournal && journal && journal.status !== "verified") targets.push("journal");
    if (targets.length === 0) return;
    setReviewing("verify");
    try {
      for (const type of targets) {
        await api.post(`/hte/interns/${uuid}/records/verify`, { type, date: dateParam });
      }
      toast.success("Record(s) verified");
      setVerifyOpen(false);
      await load();
    } catch (err) {
      toast.error("Review failed", { description: firstErrorMessage(err) });
    } finally {
      setReviewing(null);
    }
  }

  function openFlagDialog() {
    setFlagDtr(Boolean(dtr && dtr.status !== "flagged"));
    setFlagJournal(Boolean(journal && journal.status !== "flagged"));
    setFlagOpen(true);
  }

  async function flagRecords() {
    if (reviewing) return;
    const targets = [];
    if (flagDtr && dtr && dtr.status !== "flagged") targets.push("dtr");
    if (flagJournal && journal && journal.status !== "flagged") targets.push("journal");
    if (targets.length === 0 || !remarks.trim()) return;
    setReviewing("flag");
    try {
      for (const type of targets) {
        await api.post(`/hte/interns/${uuid}/records/flag`, {
          type,
          date: dateParam,
          remarks: remarks.trim(),
        });
      }
      toast.success("Record(s) flagged");
      setRemarks("");
      setFlagOpen(false);
      await load();
    } catch (err) {
      toast.error("Review failed", { description: firstErrorMessage(err) });
    } finally {
      setReviewing(null);
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
          <Link to={`/hte/records/${uuid}`}>
            <ArrowLeft size={16} /> Back to calendar
          </Link>
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-xl text-green-700">
            <Link to={`/hte/records/${uuid}`}>Back to calendar</Link>
          </Button>
        </div>
      ) : intern ? (
        <>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  {intern.profile_picture && <AvatarImage src={intern.profile_picture} alt={intern.full_name} />}
                  <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-sm font-bold text-white">
                    {getInitials(intern.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="truncate font-heading text-xl font-bold text-green-950 sm:text-2xl">
                    {intern.full_name}
                  </h1>
                  <p className="truncate text-sm text-gray-500">
                    {intern.program || "—"} · {intern.institute || "—"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-500">{prettyDate}</p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => goToDay(prevDay)}
                    aria-label="Previous day"
                    className="h-11 rounded-xl px-3 text-gray-600"
                  >
                    <ChevronLeft size={16} /> Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => goToDay(nextDay)}
                    disabled={isToday}
                    aria-label="Next day"
                    className="h-11 rounded-xl px-3 text-gray-600"
                  >
                    Next <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <section className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
                    <Clock3 size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Photo DTR — read only</p>
                    <p className="font-heading text-base font-bold text-gray-800">{formatDate(dateParam)}</p>
                  </div>
                </div>
                {dtr ? (
                  <StatusChip status={dtr.status} />
                ) : (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600 ring-1 ring-red-200">
                    No DTR
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { title: "Morning", inKey: "am_in", outKey: "am_out" },
                  { title: "Afternoon", inKey: "pm_in", outKey: "pm_out" },
                ].map((session) => {
                  const inLabel = SLOTS.find((slot) => slot.key === session.inKey)?.label;
                  const outLabel = SLOTS.find((slot) => slot.key === session.outKey)?.label;
                  return (
                    <div key={session.title} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{session.title}</p>
                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{inLabel}</p>
                          <p className="font-mono text-base font-bold text-gray-800">
                            {formatTime(dtr?.slots?.[session.inKey]?.time)}
                          </p>
                        </div>
                        <ArrowRight size={14} className="shrink-0 text-gray-300" />
                        <div className="min-w-0 text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{outLabel}</p>
                          <p className="font-mono text-base font-bold text-gray-800">
                            {formatTime(dtr?.slots?.[session.outKey]?.time)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Duration</span>
                        <span className="font-mono text-xs font-bold text-green-700">
                          {pairDuration(dtr?.slots, session.inKey, session.outKey) || "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 ring-1 ring-green-100">
                <span className="text-xs font-bold uppercase tracking-wider text-green-700">Total hours</span>
                <span className="font-heading text-xl font-bold text-green-800">
                  {duration ? `${duration.hours}h ${duration.minutes}m` : "—"}
                </span>
              </div>

              {dtr?.status === "flagged" && dtr.remarks && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
                  <Flag size={16} className="mt-0.5 shrink-0 text-red-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-red-700">HTE feedback</p>
                    <p className="mt-0.5 text-sm text-red-800">{dtr.remarks}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
              {journal ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
                        <BookOpenText size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Journal entry</p>
                        <p className="font-heading text-base font-bold text-gray-800">{journal.title}</p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "shrink-0 rounded-full font-semibold ring-1",
                        JOURNAL_STATUS[journal.status]?.badge
                      )}
                    >
                      {JOURNAL_STATUS[journal.status]?.label || journal.status}
                    </Badge>
                  </div>

                  {journal.status === "flagged" && journal.remarks && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
                      <Flag size={16} className="mt-0.5 shrink-0 text-red-600" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-700">Supervisor feedback</p>
                        <p className="mt-0.5 text-sm text-red-800">{journal.remarks}</p>
                      </div>
                    </div>
                  )}

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{journal.journal}</p>

                  {journal.photos?.length > 0 && (
                    <div className="mt-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        {journal.photos.length} photo{journal.photos.length === 1 ? "" : "s"}
                      </p>
                      <div className="mt-2.5 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                        {journal.photos.map((photo) => (
                          <a
                            key={photo.id}
                            href={photo.photo_url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="View journal photo"
                            className="block aspect-square overflow-hidden rounded-xl ring-2 ring-gray-100"
                          >
                            <img src={photo.photo_url} alt="Journal" className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
                    <NotebookPen size={20} />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">No journal entry for this date</p>
                  <p className="max-w-xs text-xs text-gray-400">
                    The intern attended but did not submit a journal for {formatDate(dateParam)}.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Review records</p>
                  <p className="font-heading text-base font-bold text-gray-800">{formatDate(dateParam)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={openVerifyDialog}
                  disabled={
                    ((!dtr || dtr.status === "verified") && (!journal || journal.status === "verified")) ||
                    Boolean(reviewing)
                  }
                  className="h-11 w-full rounded-xl border-green-200 text-sm font-semibold text-green-700 hover:bg-green-50 sm:w-auto"
                >
                  <ShieldCheck size={16} /> Verify records…
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openFlagDialog}
                  disabled={
                    (!dtr || dtr.status === "flagged") && (!journal || journal.status === "flagged")
                  }
                  className="h-11 w-full rounded-xl border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 sm:w-auto"
                >
                  <Flag size={16} /> Flag records…
                </Button>
              </div>
            </div>
          </section>

          <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Verify records</DialogTitle>
                <DialogDescription>
                  Select the record(s) to mark as verified for {formatDate(dateParam)}.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-2.5">
                <RecordCheckRow
                  title="Photo DTR"
                  checked={verifyDtr}
                  disabled={!dtr || dtr.status === "verified"}
                  statusText={dtr ? recordStatusText(dtr.status) : undefined}
                  onCheckedChange={setVerifyDtr}
                />
                <RecordCheckRow
                  title="Journal entry"
                  checked={verifyJournal}
                  disabled={!journal || journal.status === "verified"}
                  statusText={journal ? recordStatusText(journal.status) : undefined}
                  onCheckedChange={setVerifyJournal}
                />
              </div>

              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => setVerifyOpen(false)}
                  disabled={Boolean(reviewing)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-green-600 hover:bg-green-700"
                  onClick={confirmVerify}
                  disabled={Boolean(reviewing) || (!verifyDtr && !verifyJournal)}
                >
                  {reviewing === "verify" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  Verify selected
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Flag records</DialogTitle>
                <DialogDescription>
                  Select the record(s) to flag for {formatDate(dateParam)} and add your remarks.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-2.5">
                <RecordCheckRow
                  title="Photo DTR"
                  checked={flagDtr}
                  disabled={!dtr || dtr.status === "flagged"}
                  statusText={dtr ? recordStatusText(dtr.status) : undefined}
                  onCheckedChange={setFlagDtr}
                />
                <RecordCheckRow
                  title="Journal entry"
                  checked={flagJournal}
                  disabled={!journal || journal.status === "flagged"}
                  statusText={journal ? recordStatusText(journal.status) : undefined}
                  onCheckedChange={setFlagJournal}
                />
              </div>

              <label htmlFor="flag-remarks" className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Remarks
              </label>
              <Textarea
                id="flag-remarks"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Required — explain why this record is flagged…"
                className="mt-1 rounded-xl text-sm leading-relaxed"
              />

              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => setFlagOpen(false)}
                  disabled={Boolean(reviewing)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 rounded-xl"
                  onClick={flagRecords}
                  disabled={Boolean(reviewing) || !remarks.trim() || (!flagDtr && !flagJournal)}
                >
                  {reviewing === "flag" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Flag size={16} />
                  )}
                  Flag selected
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      )}
    </HteLayout>
  );
}
