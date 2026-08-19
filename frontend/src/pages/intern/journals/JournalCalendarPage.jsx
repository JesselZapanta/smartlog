import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { getDefaultClassNames } from "react-day-picker";
import { toast } from "sonner";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  FileClock,
  Flag,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import InternLayout from "@/layouts/InternLayout.jsx";
import api from "@/lib/api";
import { toYMD } from "@/lib/dates";
import { firstErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

function dateKey(date) {
  return format(date, "yyyy-MM-dd");
}

export default function JournalCalendarPage() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [entries, setEntries] = useState([]);
  const [dtrDates, setDtrDates] = useState(() => new Set());
  const [dtrReady, setDtrReady] = useState(false);
  const [deployed, setDeployed] = useState(true);
  const [ojtStatus, setOjtStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const loadJournals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/intern/journals?month=${format(monthDate, "yyyy-MM")}`);
      setEntries(res.data.data || []);
      setDeployed(Boolean(res.data.deployed));
      setOjtStatus(res.data.ojt_status || "");
    } catch (err) {
      toast.error("Failed to load journals", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [monthDate]);

  const loadDtr = useCallback(async () => {
    try {
      const month = format(monthDate, "yyyy-MM");
      const monthEnd = toYMD(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));
      const res = await api.get(`/intern/photo-dtr?from=${month}-01&to=${monthEnd}`);
      setDtrDates(new Set((res.data.data || []).map((record) => record.dtr_date)));
    } catch {
      // DTR markers are optional — the calendar still renders, just without locks/markers
    } finally {
      setDtrReady(true);
    }
  }, [monthDate]);

  useEffect(() => {
    loadJournals();
    loadDtr();
  }, [loadJournals, loadDtr]);

  const entriesByDate = useMemo(() => new Map(entries.map((entry) => [entry.date, entry])), [entries]);
  const statusByDate = useMemo(
    () => new Map(entries.map((entry) => [entry.date, entry.status])),
    [entries]
  );
  const disabledDays = useMemo(() => {
    const matchers = [{ after: today }];
    if (dtrReady) matchers.push((date) => !dtrDates.has(dateKey(date)));
    return matchers;
  }, [today, dtrReady, dtrDates]);

  function JournalDayButton({ day, modifiers, ...props }) {
    const key = dateKey(day.date);
    const hasEntry = entriesByDate.has(key);
    const status = statusByDate.get(key);
    const checked = status === "checked";
    const verified = status === "verified";
    const pending = status === "pending";
    const flagged = status === "flagged";
    const rejected = status === "rejected";
    const problem = flagged || rejected;
    const hasDtr = dtrReady && dtrDates.has(key);
    const outside = modifiers.outside;
    const isFutureDate = day.date > today;
    const missingDtr = dtrReady && !outside && !isFutureDate && !hasDtr;
    const selectable = dtrReady
      ? !outside && !isFutureDate && hasDtr
      : !outside && !isFutureDate;
    return (
      <CalendarDayButton
        day={day}
        modifiers={modifiers}
        className={cn(
          "rounded-2xl! transition-colors duration-150",
          missingDtr || problem
            ? "bg-red-50/70 hover:bg-red-100!"
            : pending
              ? "bg-amber-50/70 hover:bg-amber-100!"
              : hasEntry
                ? "bg-green-50 hover:bg-green-100!"
                : "hover:bg-green-50!",
          modifiers.today && "font-bold",
          !selectable && "opacity-50"
        )}
        {...props}
      >
        <div
          className={cn(
            "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-sm font-bold leading-none sm:h-7 sm:min-w-7 sm:px-2 sm:text-base",
            modifiers.today
              ? "bg-green-600 text-white"
              : missingDtr || problem
                ? "text-red-800"
                : pending
                  ? "text-amber-800"
                  : hasEntry
                    ? "text-green-900"
                    : "text-gray-900"
          )}
        >
          {format(day.date, "d")}
        </div>
        {!outside && (
          <div className="flex h-3 items-center justify-center">
            {missingDtr ? (
              <X size={12} strokeWidth={3} className="size-3 text-red-500" />
            ) : rejected ? (
              <X size={12} strokeWidth={3} className="size-3 text-red-500" />
            ) : flagged ? (
              <Flag size={12} strokeWidth={3} className="size-3 text-red-500" />
            ) : checked ? (
              <Check size={12} strokeWidth={3.5} className="size-3 text-green-600" />
            ) : verified ? (
              <span className="size-1.5 rounded-full bg-green-500" />
            ) : pending ? (
              <span className="size-1.5 rounded-full bg-amber-500" />
            ) : (
              <span className="size-1.5 rounded-full bg-gray-300" />
            )}
          </div>
        )}
      </CalendarDayButton>
    );
  }

  const prevMonth = () => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const canGoNext = monthDate.getFullYear() < today.getFullYear() || monthDate.getMonth() < today.getMonth();

  return (
    <InternLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-green-950 sm:text-3xl">Daily Journal</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tap a date with a photo DTR record to write or review your journal entry.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/intern/journals/${dateKey(today)}`)}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 active:scale-95"
        >
          <Plus size={16} /> Today&apos;s entry
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : !deployed ? (
        ojtStatus === "hours_completed" ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <FileClock size={20} />
            </div>
            <p className="text-sm font-semibold text-indigo-800">Hours completed</p>
            <p className="max-w-sm text-xs text-indigo-700/80">
              You have completed your required OJT hours. Your records are now being reviewed by your HTE and
              instructor.
            </p>
          </div>
        ) : ojtStatus === "completed" ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <FileClock size={20} />
            </div>
            <p className="text-sm font-semibold text-blue-800">OJT completed</p>
            <p className="max-w-sm text-xs text-blue-700/80">
              Congratulations! You have completed your OJT.
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <FileClock size={20} />
            </div>
            <p className="text-sm font-semibold text-amber-800">Not deployed yet</p>
            <p className="max-w-sm text-xs text-amber-700/80">
              You can start writing your daily journal once the coordinator deploys you to your host training
              establishment.
            </p>
          </div>
        )
      ) : (
        <div className="mt-6 space-y-5">
          <section className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm ring-1 ring-green-100">
            <div className="flex items-center gap-3 border-b border-green-100/70 bg-gradient-to-r from-green-700 to-green-500 px-4 py-3 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30">
                <CalendarDays size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-100">Journal calendar</p>
                <p className="truncate font-heading text-base font-bold text-white sm:text-lg">
                  {format(monthDate, "MMMM yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30 transition-colors hover:bg-white/25 active:scale-95"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  disabled={!canGoNext}
                  aria-label="Next month"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30 transition-colors hover:bg-white/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-5">
              <Calendar
                mode="single"
                month={monthDate}
                onMonthChange={setMonthDate}
                disabled={disabledDays}
                components={{ DayButton: JournalDayButton }}
                classNames={{
                  weekday: cn(
                    "flex-1 rounded-(--cell-radius) select-none text-[10px] font-bold uppercase tracking-wider text-green-700/60",
                    getDefaultClassNames().weekday
                  ),
                }}
                onSelect={(date) => {
                  if (date) navigate(`/intern/journals/${dateKey(date)}`);
                }}
                className="mx-auto w-full max-w-xl [--cell-size:--spacing(11)] md:[--cell-size:--spacing(14)] [--cell-radius:var(--radius-xl)]"
              />

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <Check size={12} strokeWidth={3.5} className="text-green-600" /> Checked
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-green-500" /> Verified
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-amber-500" /> Pending
                </span>
                <span className="inline-flex items-center gap-1">
                  <Flag size={12} strokeWidth={3} className="text-red-500" /> Flagged
                </span>
                <span className="inline-flex items-center gap-1">
                  <X size={12} strokeWidth={3} className="text-red-500" /> Rejected
                </span>
                <span className="inline-flex items-center gap-1">
                  <X size={12} strokeWidth={3} className="text-red-500" /> No photo DTR — locked
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-gray-300" /> Attended, no entry
                </span>
              </div>
            </div>
          </section>
        </div>
      )}
    </InternLayout>
  );
}