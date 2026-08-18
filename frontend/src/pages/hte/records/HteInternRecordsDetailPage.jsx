import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { getDefaultClassNames } from "react-day-picker";
import { ArrowLeft, BookOpenText, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Flag, Loader2 } from "lucide-react";
import HteLayout from "@/layouts/HteLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/PageLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const STAT_TONES = {
  green: "bg-green-50 text-green-700 ring-green-100",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  red: "bg-red-50 text-red-700 ring-red-100",
};

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${STAT_TONES[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="font-heading text-xl font-bold leading-tight text-gray-900">{value}</p>
        <p className="truncate text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function dateKey(date) {
  return format(date, "yyyy-MM-dd");
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

export default function HteInternRecordsDetailPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [intern, setIntern] = useState(null);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const month = format(monthDate, "yyyy-MM");
      const [internRes, recordsRes] = await Promise.all([
        api.get(`/hte/interns/${uuid}`),
        api.get(`/hte/interns/${uuid}/records?month=${month}`),
      ]);
      setIntern(internRes.data.data);
      setJournals(recordsRes.data.data || []);
    } catch (err) {
      setError(firstErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [uuid, monthDate]);

  useEffect(() => {
    load();
  }, [load]);

  const journalDateSet = useMemo(() => new Set(journals.map((entry) => entry.date)), [journals]);
  const flaggedDateSet = useMemo(
    () => new Set(journals.filter((entry) => entry.status === "flagged").map((entry) => entry.date)),
    [journals]
  );
  const disabledDays = useMemo(
    () => [{ after: today }, (date) => !journalDateSet.has(dateKey(date))],
    [today, journalDateSet]
  );

  const stats = useMemo(() => {
    const verified = journals.filter((entry) => entry.status === "verified").length;
    const flagged = journals.filter((entry) => entry.status === "flagged").length;
    const unchecked = journals.length - verified - flagged;
    return { total: journals.length, verified, unchecked, flagged };
  }, [journals]);

  function DayButton({ day, modifiers, ...props }) {
    const key = dateKey(day.date);
    const hasJournal = journalDateSet.has(key);
    const flagged = flaggedDateSet.has(key);
    const outside = modifiers.outside;
    const isFutureDate = day.date > today;
    const selectable = !outside && !isFutureDate && hasJournal;
    return (
      <CalendarDayButton
        day={day}
        modifiers={modifiers}
        className={cn(
          "rounded-2xl! transition-colors duration-150",
          flagged
            ? "bg-red-50/70 hover:bg-red-100!"
            : hasJournal
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
              : flagged
                ? "text-red-800"
                : hasJournal
                  ? "text-green-900"
                  : "text-gray-900"
          )}
        >
          {format(day.date, "d")}
        </div>
        {!outside && (
          <div className="flex h-3 items-center justify-center">
            {flagged ? (
              <Flag size={12} strokeWidth={3} className="size-3 text-red-500" />
            ) : hasJournal ? (
              <Check size={12} strokeWidth={3.5} className="size-3 text-green-600" />
            ) : null}
          </div>
        )}
      </CalendarDayButton>
    );
  }

  const prevMonth = () => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const canGoNext = monthDate.getFullYear() < today.getFullYear() || monthDate.getMonth() < today.getMonth();

  return (
    <HteLayout>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          className="h-11 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-green-700"
        >
          <Link to="/hte/records">
            <ArrowLeft size={16} /> Back to intern records
          </Link>
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-xl text-green-700">
            <Link to="/hte/records">Back to intern records</Link>
          </Button>
        </div>
      ) : intern ? (
        <>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
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
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={BookOpenText} label="Journals" value={stats.total} tone="green" />
            <StatCard icon={CheckCircle2} label="Verified" value={stats.verified} tone="indigo" />
            <StatCard icon={Clock3} label="Unchecked" value={stats.unchecked} tone="amber" />
            <StatCard icon={Flag} label="Flagged" value={stats.flagged} tone="red" />
          </div>

          <section className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm ring-1 ring-green-100">
            <div className="flex items-center gap-3 border-b border-green-100/70 bg-gradient-to-r from-green-700 to-green-500 px-4 py-3 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30">
                <CalendarDays size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-100">DTR & journal</p>
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
                onSelect={(date) => {
                  if (date) navigate(`/hte/records/${uuid}/${dateKey(date)}`);
                }}
                disabled={disabledDays}
                components={{ DayButton }}
                classNames={{
                  weekday: cn(
                    "flex-1 rounded-(--cell-radius) select-none text-[10px] font-bold uppercase tracking-wider text-green-700/60",
                    getDefaultClassNames().weekday
                  ),
                }}
                className="mx-auto w-full max-w-xl [--cell-size:--spacing(11)] md:[--cell-size:--spacing(14)] [--cell-radius:var(--radius-xl)]"
              />

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <Check size={12} strokeWidth={3.5} className="text-green-600" /> Journal entry
                </span>
                <span className="inline-flex items-center gap-1">
                  <Flag size={12} strokeWidth={3} className="text-red-500" /> Flagged — tap to view
                </span>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      )}
    </HteLayout>
  );
}
