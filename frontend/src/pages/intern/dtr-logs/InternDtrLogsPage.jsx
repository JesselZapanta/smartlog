import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock3, Loader2, Printer, X } from "lucide-react";
import InternLayout from "@/layouts/InternLayout.jsx";
import OjtHoursCard from "@/components/OjtHoursCard.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SLOTS = [
  { key: "am_in", label: "AM In" },
  { key: "am_out", label: "AM Out" },
  { key: "pm_in", label: "PM In" },
  { key: "pm_out", label: "PM Out" },
];

function formatTime(value) {
  if (!value) return "—";
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function computeHours(slots) {
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

function formatDate(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusPill({ status }) {
  const tones = {
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    verified: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    checked: "bg-green-50 text-green-700 ring-green-200",
    disapproved: "bg-red-50 text-red-600 ring-red-200",
  };
  const labels = {
    pending: "Pending",
    verified: "Verified by HTE",
    checked: "Checked by instructor",
    disapproved: "Disapproved",
  };
  return (
    <Badge className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${tones[status] || tones.pending}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status] || status}
    </Badge>
  );
}

function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function InternDtrLogsPage() {
  const [records, setRecords] = useState([]);
  const [hoursSummary, setHoursSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const date = new Date();
    return toYMD(new Date(date.getFullYear(), date.getMonth(), 1));
  });
  const [to, setTo] = useState(() => {
    const date = new Date();
    return toYMD(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  });
  const [viewPhoto, setViewPhoto] = useState(null);

  useEffect(() => {
    if (!viewPhoto) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [viewPhoto]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await api.get(`/intern/photo-dtr?${params.toString()}`);
      setRecords(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load DTR logs", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get("/intern/ojt-hours")
      .then((res) => setHoursSummary(res.data.data || null))
      .catch(() => setHoursSummary(null));
  }, []);

  const [printing, setPrinting] = useState(false);

  function handlePrint() {
    if (!from || !to || printing) return;
    setPrinting(true);
    const iframe = document.createElement("iframe");
    iframe.src = `/intern/dtr-logs/print?from=${from}&to=${to}`;
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "800px";
    iframe.style.height = "600px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.zIndex = "-1";

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      setTimeout(() => iframe.remove(), 500);
      setPrinting(false);
    };

    const onMessage = (event) => {
      if (event.data?.type !== "smartlog-dtr-print-ready") return;
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          toast.error("Print failed", { description: "Could not open the print dialog." });
        } finally {
          cleanup();
        }
      }, 250);
    };

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  }

  return (
    <InternLayout>
      <div>
        <h1 className="font-heading text-2xl font-bold text-green-950 sm:text-3xl">DTR Logs</h1>
        <p className="mt-1 text-sm text-gray-500">Your daily time record logs with photo punches.</p>
      </div>

      {hoursSummary && (
        <div className="mt-6">
          <OjtHoursCard
            requiredHours={hoursSummary.required_hours}
            earnedMinutes={hoursSummary.earned_minutes}
            institute={hoursSummary.institute}
          />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Attendance</h2>
          {records.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
              {records.length} record{records.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={printing}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-green-200 px-4 text-sm font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:opacity-60 lg:w-auto"
          >
            {printing ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
            {printing ? "Preparing..." : "Print report"}
          </button>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="dtr-from" className="w-8 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                From
              </label>
              <div className="min-w-0 flex-1">
                <Input id="dtr-from" type="date" className="h-11 rounded-xl" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} />
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="dtr-to" className="w-8 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                To
              </label>
              <div className="min-w-0 flex-1">
                <Input id="dtr-to" type="date" className="h-11 rounded-xl" value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : records.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-10 text-center">
          <Clock3 size={20} className="text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">No records in this range</p>
          <p className="text-xs text-gray-400">Adjust the date filter, or clock in on the Photo DTR page.</p>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-green-50 hover:bg-green-50">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Date</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">AM In</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">AM Out</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">PM In</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">PM Out</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Hours</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Minutes</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const worked = computeHours(record.slots);
                  return (
                    <TableRow
                      key={record.id}
                      className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-green-50/40"
                    >
                      <TableCell>
                        <span className="text-sm font-bold text-gray-800">{formatDate(record.dtr_date)}</span>
                      </TableCell>
                      {SLOTS.map((slot) => {
                        const punched = record.slots?.[slot.key];
                        return (
                          <TableCell key={slot.key}>
                            {punched?.time ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewPhoto({
                                      url: punched.photo_url,
                                      label: slot.label,
                                      time: formatTime(punched.time),
                                    })
                                  }
                                  className="cursor-zoom-in"
                                  aria-label={`View ${slot.label} photo`}
                                >
                                  <img
                                    src={punched.photo_url}
                                    alt={`${slot.label} photo`}
                                    className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-gray-200"
                                  />
                                </button>
                                <span className="font-mono text-xs font-bold text-gray-700">{formatTime(punched.time)}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-300">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <span className="font-mono text-sm font-bold text-gray-700">{worked ? worked.hours : "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-bold text-gray-700">{worked ? worked.minutes : "—"}</span>
                      </TableCell>
                      <TableCell>
                        <StatusPill status={record.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {viewPhoto && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95" onClick={() => setViewPhoto(null)}>
          <button
            type="button"
            onClick={() => setViewPhoto(null)}
            aria-label="Close photo"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur"
          >
            <X size={20} />
          </button>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <img
              src={viewPhoto.url}
              alt={`${viewPhoto.label} photo`}
              onClick={(event) => event.stopPropagation()}
              className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
          <div className="pb-6 pt-2 text-center">
            <p className="text-sm font-bold text-white">{viewPhoto.label}</p>
            <p className="mt-0.5 font-mono text-xs text-white/60">{viewPhoto.time}</p>
          </div>
        </div>
      )}
    </InternLayout>
  );
}
