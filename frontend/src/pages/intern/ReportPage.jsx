import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Printer,
  Loader2,
  Camera,
  NotebookPen,
  FolderUp,
  Clock3,
  AlertTriangle,
  FileText,
  CalendarCheck,
  BookOpen,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Award,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InternLayout from "@/layouts/InternLayout.jsx";
import PageHeader from "@/components/PageHeader.jsx";
import StatCard from "@/components/StatCard.jsx";
import SectionCard from "@/components/SectionCard.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/dates";

const REPORTS = [
  {
    key: "overview",
    label: "Executive Overview",
    desc: "KPIs for DTR, journals & requirements",
    icon: BarChart3,
    tone: "green",
    statKey: "dtr.total",
  },
  {
    key: "dtr",
    label: "Photo DTR & DTR Logs",
    desc: "Attendance records and status",
    icon: Camera,
    tone: "teal",
    statKey: "dtr.total",
  },
  {
    key: "journals",
    label: "Daily Journal",
    desc: "Daily entries and submissions",
    icon: NotebookPen,
    tone: "emerald",
    statKey: "journals.total",
  },
  {
    key: "requirements",
    label: "Requirements",
    desc: "Compliance and submissions",
    icon: FolderUp,
    tone: "amber",
    statKey: "requirements.total",
  },
];

const iconToneClasses = {
  green: "bg-green-50 text-green-700 ring-green-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  teal: "bg-teal-50 text-teal-700 ring-teal-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
};

function getReportCount(data, statKey) {
  if (!data || !statKey) return 0;
  const parts = statKey.split(".");
  let cur = data;
  for (const p of parts) cur = cur?.[p];
  return cur ?? 0;
}

const statusTone = {
  pending: "bg-amber-100 text-amber-700 ring-amber-200",
  approved: "bg-green-100 text-green-700 ring-green-200",
  rejected: "bg-red-100 text-red-700 ring-red-200",
  checked: "bg-green-100 text-green-700 ring-green-200",
  submitted: "bg-blue-100 text-blue-700 ring-blue-200",
  verified: "bg-green-100 text-green-700 ring-green-200",
  flagged: "bg-red-100 text-red-700 ring-red-200",
};

function StatusBadge({ value }) {
  const cls = statusTone[String(value)] || "bg-gray-100 text-gray-600 ring-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${cls}`}>
      {String(value).replace(/-/g, " ")}
    </span>
  );
}

function miniStat(label, value) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1 font-heading text-lg font-bold tracking-tight text-gray-900">{Number(value ?? 0).toLocaleString()}</p>
    </div>
  );
}

function formatTime(value) {
  if (!value) return " - ";
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function ReportPrintBar({ onPrint, reportKey, isPrinting, label }) {
  return (
    <div className="flex">
      <Button
        onClick={() => onPrint(reportKey)}
        disabled={isPrinting}
        className="h-11 w-full justify-center whitespace-nowrap rounded-xl bg-green-600 px-5 font-semibold text-white hover:bg-green-700 disabled:opacity-60 sm:ml-auto sm:w-auto"
      >
        {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
        {isPrinting ? "Preparing..." : label || "Print Report"}
      </Button>
    </div>
  );
}

function OverviewView({ data, onPrint, isPrinting }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <ReportPrintBar onPrint={onPrint} reportKey="overview" isPrinting={isPrinting} label="Print Executive Report" />
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="OJT Hours" value={data.ojt_hours?.earned ?? 0} helper={`of ${data.ojt_hours?.required ?? 0} required`} icon={<TrendingUp size={18} />} tone="green" />
        <StatCard label="Photo DTR" value={data.dtr.total} helper={`${Object.keys(data.dtr.by_status || {}).length} statuses`} icon={<Camera size={18} />} tone="teal" />
        <StatCard label="Daily Journals" value={data.journals.total} helper={`${data.journals.recent?.length || 0} recent`} icon={<NotebookPen size={18} />} tone="emerald" />
        <StatCard label="Requirements" value={data.requirements.total} helper={`${data.requirements.definitions_total} types`} icon={<FolderUp size={18} />} tone="amber" />
      </section>

      <SectionCard title="OJT Progress" subtitle={`${data.ojt_hours?.earned ?? 0} of ${data.ojt_hours?.required ?? 0} hours completed`}>
        <div className="relative h-4 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all" style={{ width: `${data.ojt_hours?.progress ?? 0}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span className="font-mono font-semibold text-green-700">{data.ojt_hours?.earned ?? 0}h earned</span>
          <span className="font-mono">{data.ojt_hours?.remaining ?? 0}h remaining</span>
        </div>
      </SectionCard>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="DTR Status Breakdown" subtitle="Your photo DTR by verification status">
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.dtr.by_status || {}).map(([s, c]) => (
              <span key={s} className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold shadow-sm">
                <StatusBadge value={s} /> <span className="font-heading">{c}</span>
              </span>
            ))}
            {Object.keys(data.dtr.by_status || {}).length === 0 && <span className="text-xs text-gray-400">No DTR data</span>}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {miniStat("Total DTR", data.dtr.total)}
            {miniStat("Approved", data.dtr.by_status?.checked || data.dtr.by_status?.approved || 0)}
          </div>
        </SectionCard>
        <SectionCard title="Requirements Compliance" subtitle={`${data.requirements.definitions_total} types Â· ${data.requirements.total} submissions`}>
          <div className="space-y-2">
            {(data.requirements.by_requirement || []).slice(0, 3).map((r) => (
              <div key={r.name} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-gray-800">{r.name}</p>
                  <StatusBadge value={r.is_active ? "active" : "inactive"} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <span className="rounded bg-amber-50 py-1 text-xs font-bold text-amber-700">{r.pending} pending</span>
                  <span className="rounded bg-green-50 py-1 text-xs font-bold text-green-700">{r.approved} approved</span>
                  <span className="rounded bg-red-50 py-1 text-xs font-bold text-red-700">{r.rejected} rejected</span>
                </div>
              </div>
            ))}
            {!(data.requirements.by_requirement || []).length && <p className="py-6 text-center text-xs text-gray-400">No requirement types</p>}
          </div>
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Recent DTR" subtitle="Latest photo DTR entries">
          {!(data.dtr.recent || []).length ? (
            <p className="py-6 text-center text-sm text-gray-400">No DTR entries yet</p>
          ) : (
            <div className="space-y-2">
              {data.dtr.recent.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{formatDate(r.date)}</p>
                    <p className="font-mono text-xs text-gray-500">
                      {formatTime(r.am_in)} â†’ {formatTime(r.am_out)} Â· {formatTime(r.pm_in)} â†’ {formatTime(r.pm_out)}
                    </p>
                  </div>
                  <StatusBadge value={r.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="Recent Journals" subtitle="Latest daily entries">
          {!(data.journals.recent || []).length ? (
            <p className="py-6 text-center text-sm text-gray-400">No journals yet</p>
          ) : (
            <div className="space-y-2">
              {data.journals.recent.map((r, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                  <p className="truncate text-sm font-medium text-gray-800">{r.title || "Untitled"}</p>
                  <p className="text-xs text-gray-500">{formatDate(r.date)}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}

const SLOTS = [
  { key: "am_in", label: "AM In" },
  { key: "am_out", label: "AM Out" },
  { key: "pm_in", label: "PM In" },
  { key: "pm_out", label: "PM Out" },
];

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

function DtrView({ data }) {
  const [records, setRecords] = useState([]);
  const [loadingDtr, setLoadingDtr] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(null);

  useEffect(() => {
    if (!viewPhoto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [viewPhoto]);

  const load = useCallback(async () => {
    setLoadingDtr(true);
    try {
      const res = await api.get(`/intern/photo-dtr`);
      setRecords(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load DTR logs", { description: firstErrorMessage(err) });
    } finally {
      setLoadingDtr(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handlePrint() {
    if (printing) return;
    setPrinting(true);
    const iframe = document.createElement("iframe");
    iframe.src = `/intern/dtr-logs/print`;
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
    <div className="space-y-4 sm:space-y-5">
      <div className="flex justify-end">
        <Button onClick={handlePrint} disabled={printing} className="h-9 gap-1.5 rounded-xl bg-green-600 px-4 font-semibold text-white hover:bg-green-700 disabled:opacity-60">
          {printing ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
          {printing ? "Preparing..." : "Print report"}
        </Button>
      </div>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Total DTR" value={data.dtr.total} icon={<CalendarCheck size={18} />} tone="teal" />
        <StatCard label="Approved" value={data.dtr.by_status?.checked || data.dtr.by_status?.approved || 0} icon={<CheckCircle2 size={18} />} tone="green" />
        <StatCard label="Pending" value={data.dtr.by_status?.pending || 0} icon={<Clock3 size={18} />} tone="amber" />
      </section>

      <SectionCard title="DTR Status Breakdown" subtitle="All your photo DTR entries by status">
        <div className="flex flex-wrap gap-2.5">
          {Object.entries(data.dtr.by_status || {}).length === 0 ? (
            <p className="text-sm text-gray-400">No DTR submissions</p>
          ) : (
            Object.entries(data.dtr.by_status || {}).map(([status, count]) => (
              <div key={status} className="inline-flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <StatusBadge value={status} />
                <span className="font-heading text-lg font-bold text-gray-900">{count}</span>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard title="DTR Logs" subtitle="All your DTR logs — 1 month per page on print">
        {loadingDtr ? (
          <div className="mt-4 flex h-40 items-center justify-center">
            <Loader2 size={24} className="animate-spin text-green-600" />
          </div>
        ) : records.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-8 text-center">
            <Clock3 size={20} className="text-gray-300" />
            <p className="text-sm font-semibold text-gray-500">No records</p>
            <p className="text-xs text-gray-400">Clock in on the Photo DTR page.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
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
                      <TableRow key={record.id} className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-green-50/40">
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
                                    onClick={() => setViewPhoto({ url: punched.photo_url, label: slot.label, time: formatTime(punched.time) })}
                                    className="cursor-zoom-in"
                                    aria-label={`View ${slot.label} photo`}
                                  >
                                    <img src={punched.photo_url} alt={`${slot.label} photo`} className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />
                                  </button>
                                  <span className="font-mono text-xs font-bold text-gray-700">{formatTime(punched.time)}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-300">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <span className="font-mono text-sm font-bold text-gray-700">{worked ? worked.hours : "-"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-bold text-gray-700">{worked ? worked.minutes : "-"}</span>
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
      </SectionCard>

      <SectionCard title="OJT Hours" subtitle={`${data.ojt_hours?.earned ?? 0} of ${data.ojt_hours?.required ?? 0} hours completed`}>
        <div className="relative h-4 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all" style={{ width: `${data.ojt_hours?.progress ?? 0}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span className="font-mono font-semibold text-green-700">{data.ojt_hours?.earned ?? 0}h earned</span>
          <span className="font-mono">{data.ojt_hours?.remaining ?? 0}h remaining</span>
        </div>
      </SectionCard>

      {viewPhoto && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95" onClick={() => setViewPhoto(null)}>
          <button type="button" onClick={() => setViewPhoto(null)} aria-label="Close photo" className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur">
            <span className="text-lg">x</span>
          </button>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <img src={viewPhoto.url} alt={`${viewPhoto.label} photo`} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
          </div>
          <div className="pb-6 pt-2 text-center">
            <p className="text-sm font-bold text-white">{viewPhoto.label}</p>
            <p className="mt-0.5 font-mono text-xs text-white/60">{viewPhoto.time}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function JournalsView({ data, onPrint, isPrinting }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <ReportPrintBar onPrint={onPrint} reportKey="journals" isPrinting={isPrinting} label="Print Journal Report" />
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Total Journals" value={data.journals.total} icon={<NotebookPen size={18} />} tone="emerald" />
        <StatCard label="DTR Entries" value={data.dtr.total} icon={<CalendarCheck size={18} />} tone="teal" />
        <StatCard label="OJT Progress" value={`${data.ojt_hours?.progress ?? 0}%`} icon={<TrendingUp size={18} />} tone="green" />
      </section>

      <SectionCard title="Daily Journals" subtitle="Your submitted daily entries — title, journal, status and photos">
        {!(data.journals.recent || []).length ? (
          <p className="py-8 text-center text-sm text-gray-400">No journals yet</p>
        ) : (
          <div className="space-y-3">
            {data.journals.recent.map((r, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-col gap-1.5 border-b border-gray-100 bg-gray-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-heading text-sm font-bold text-gray-900">{r.title || "Untitled"}</p>
                    <p className="text-xs text-gray-500">{formatDate(r.date)}</p>
                  </div>
                  <StatusBadge value={r.status || "pending"} />
                </div>
                <div className="px-4 py-3">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
                    {r.journal || <span className="italic text-gray-400">No journal content</span>}
                  </p>
                  {r.photos && r.photos.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {r.photos.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-xl ring-1 ring-gray-200">
                          <img src={url} alt={`Journal photo ${idx + 1}`} className="h-20 w-full object-cover transition group-hover:scale-[1.02] sm:h-24" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function RequirementsView({ data, onPrint, isPrinting }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <ReportPrintBar onPrint={onPrint} reportKey="requirements" isPrinting={isPrinting} label="Print Requirements Report" />
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Requirement Types" value={data.requirements.definitions_total} icon={<FileText size={18} />} tone="amber" />
        <StatCard label="Total Submissions" value={data.requirements.total} icon={<FolderUp size={18} />} tone="emerald" />
        <StatCard label="Approved" value={data.requirements.by_status.approved || 0} icon={<CheckCircle2 size={18} />} tone="green" />
      </section>

      <SectionCard title="Submission Status" subtitle="Your requirement submissions by review status">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Pending Review", count: data.requirements.by_status.pending || 0, tone: "amber" },
            { label: "Approved", count: data.requirements.by_status.approved || 0, tone: "green" },
            { label: "Rejected", count: data.requirements.by_status.rejected || 0, tone: "red" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{item.label}</p>
              <p className="mt-1.5 font-heading text-2xl font-bold text-gray-900">{item.count}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${item.tone === "green" ? "bg-green-500" : item.tone === "amber" ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${data.requirements.total ? (item.count / data.requirements.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {Object.keys(data.requirements.by_status).length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">No submissions yet</p>
        )}
      </SectionCard>

      <SectionCard title="Compliance per Requirement" subtitle="Approved vs total per requirement type">
        {!(data.requirements.by_requirement || []).length ? (
          <p className="py-6 text-center text-sm text-gray-400">No requirement types configured</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Requirement</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Type</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Pending</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Approved</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.requirements.by_requirement.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="max-w-[180px] truncate font-medium text-gray-800">{r.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-gray-600">{r.type?.replace(/_/g, " ")}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-amber-700">{r.pending}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-green-700">{r.approved}</TableCell>
                      <TableCell className="text-right font-mono text-gray-900">{r.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

const viewMap = {
  overview: OverviewView,
  dtr: DtrView,
  journals: JournalsView,
  requirements: RequirementsView,
};

export default function InternReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [termsLoading, setTermsLoading] = useState(true);
  const [activeReport, setActiveReport] = useState("overview");
  const [isPrinting, setIsPrinting] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    api
      .get("/academic-terms/options")
      .then((res) => {
        const list = res.data.data || [];
        setAcademicYears(list);
        const active = list.find((term) => term.status === "active");
        if (active) setAcademicYearId(String(active.id));
      })
      .catch(() => {})
      .finally(() => setTermsLoading(false));
  }, []);

  const loadReport = useCallback(() => {
    if (termsLoading) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (academicYearId) params.set("academic_year_id", academicYearId);
    api
      .get(`/intern/reports?${params.toString()}`)
      .then((res) => setData(res.data.data))
      .catch((err) => toast.error("Failed to load report", { description: firstErrorMessage(err) }))
      .finally(() => setLoading(false));
  }, [academicYearId, termsLoading]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrint = useCallback(
    (reportKey = "overview") => {
      if (isPrinting) return;
      setIsPrinting(true);
      const params = new URLSearchParams();
      if (academicYearId) params.set("academic_year_id", academicYearId);
      params.set("report", reportKey);
      const printUrl = `/intern/reports/print?${params.toString()}`;
      const ensureIframe = () => {
        if (iframeRef.current) return iframeRef.current;
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.inset = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        iframe.style.zIndex = "9999";
        iframeRef.current = iframe;
        document.body.appendChild(iframe);
        return iframe;
      };
      const iframe = ensureIframe();
      iframe.src = printUrl;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        setIsPrinting(false);
      };
      const handler = (e) => {
        if (e.data?.type === "smartlog-report-print-ready") {
          setTimeout(() => {
            try {
              iframeRef.current?.contentWindow?.print();
            } catch {}
            finish();
          }, 250);
          window.removeEventListener("message", handler);
          clearTimeout(fallback);
        }
      };
      window.addEventListener("message", handler);
      const fallback = setTimeout(finish, 8000);
      iframe.addEventListener("load", () => setTimeout(finish, 3000), { once: true });
    },
    [academicYearId, isPrinting]
  );
  const handlePrintExecutive = () => handlePrint("overview");

  const ActiveView = viewMap[activeReport];
  const activeMeta = REPORTS.find((r) => r.key === activeReport);

  return (
    <InternLayout>
      <PageHeader
        icon={BarChart3}
        title="Reports"
        subtitle="Your OJT reports filtered by academic year"
        action={
          <Button
            onClick={handlePrintExecutive}
            disabled={isPrinting}
            className="h-11 whitespace-nowrap rounded-xl bg-white font-semibold text-green-700 shadow-sm hover:bg-green-50 disabled:opacity-60"
          >
            {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            <span className="hidden sm:inline">{isPrinting ? "Preparing..." : "Print Executive Report"}</span>
            <span className="sm:hidden">{isPrinting ? "Preparing..." : "Print Report"}</span>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={academicYearId} onValueChange={setAcademicYearId} disabled={termsLoading}>
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-[240px]">
            <SelectValue placeholder={termsLoading ? "Loading years..." : "Academic Year"} />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((term) => (
              <SelectItem key={term.id} value={String(term.id)}>
                {term.description || term.code}
                {term.status === "active" ? " Â· Active" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs font-medium text-gray-500">
          <span className="font-heading font-bold text-gray-900">{REPORTS.length}</span> reports available Â· filtered by academic year
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : !data ? (
        <p className="py-10 text-center text-sm text-red-600">Failed to load report data.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {REPORTS.map((report) => {
              const Icon = report.icon;
              const isActive = activeReport === report.key;
              const count = getReportCount(data, report.statKey);
              return (
                <button
                  key={report.key}
                  onClick={() => setActiveReport(report.key)}
                  className={`group relative flex min-h-[96px] flex-col justify-between overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md ${
                    isActive ? "border-green-200 ring-2 ring-green-500/20" : "border-gray-200"
                  }`}
                >
                  {isActive && <span className="absolute left-0 top-0 h-full w-1 bg-green-500" />}
                  <div className="flex items-start justify-between gap-2">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${iconToneClasses[report.tone] || iconToneClasses.green}`}>
                      <Icon size={16} />
                    </div>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${isActive ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-400 group-hover:bg-gray-100"}`}>
                      <ChevronRight size={14} />
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="font-heading text-sm font-bold leading-tight text-gray-900">{report.label}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{report.desc}</p>
                  </div>
                  <p className="mt-2 font-heading text-xs font-bold text-green-700">
                    {Number(count).toLocaleString()} records
                  </p>
                </button>
              );
            })}
          </div>

          <div>
            <h2 className="font-heading text-base font-bold text-gray-900 sm:text-lg">{activeMeta?.label}</h2>
            <p className="text-sm text-gray-500">{activeMeta?.desc}</p>
          </div>

          <ActiveView data={data} onPrint={handlePrint} isPrinting={isPrinting} />
        </>
      )}
    </InternLayout>
  );
}
