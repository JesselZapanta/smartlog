import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";

function formatTime(value) {
  if (!value) return "";
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

function daysInRange(from, to) {
  const days = [];
  const current = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function DtrForm({ records, from, to, name }) {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  const sameMonth = fromDate.getMonth() === toDate.getMonth() && fromDate.getFullYear() === toDate.getFullYear();
  const monthLabel = sameMonth
    ? fromDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : `${fromDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${toDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const days = daysInRange(from, to);
  const byDate = Object.fromEntries(records.map((record) => [record.dtr_date, record]));

  let totalMinutes = 0;
  for (const record of records) {
    const worked = computeHours(record.slots);
    if (worked) totalMinutes += worked.hours * 60 + worked.minutes;
  }
  const totalWorked = totalMinutes > 0 ? { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 } : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-left text-[9px] italic">Civil Service Form No. 48</p>
        <p className="text-right text-[9px] font-bold tracking-widest text-green-700">SMARTLOG</p>
      </div>
      <div className="mt-0.5 flex flex-1 flex-col border border-black p-2">
        <h1 className="text-center text-sm font-bold uppercase tracking-wide">Daily Time Record</h1>
        <p className="text-center text-[10px]">------o0o-----</p>

        <p className="mt-2 w-full border-b border-black pb-0.5 text-center text-[9px] font-bold uppercase">
          {name || ""}
        </p>
        {!name && <p className="mt-0.5 text-center text-[8px] italic">(Name)</p>}

        <div className="mt-2 flex items-baseline gap-1.5">
          <p className="shrink-0 text-[8px] italic">For the month of</p>
          <p className="flex-1 border-b border-black pb-0.5 text-center text-[8px] font-bold">{monthLabel}</p>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="text-[8px] italic leading-tight">
            <p>Official hours for</p>
            <p>arrival and departure</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <p className="shrink-0 text-[8px] italic">Regular days</p>
              <p className="flex-1 border-b border-black pb-0.5 text-center text-[8px] font-bold not-italic">
                {fromDate.getDate()} - {toDate.getDate()}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="shrink-0 text-[8px] italic">Saturdays</p>
              <p className="flex-1 border-b border-black pb-0.5" />
            </div>
          </div>
        </div>

      <div className="mt-2 overflow-hidden border border-black">
        <table className="w-full table-fixed border-collapse text-[7px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="whitespace-nowrap border border-black px-0.5 py-0.5 font-bold uppercase">Day</th>
              <th className="whitespace-nowrap border border-black px-0.5 py-0.5 font-bold uppercase">AM In</th>
              <th className="whitespace-nowrap border border-black px-0.5 py-0.5 font-bold uppercase">AM Out</th>
              <th className="whitespace-nowrap border border-black px-0.5 py-0.5 font-bold uppercase">PM In</th>
              <th className="whitespace-nowrap border border-black px-0.5 py-0.5 font-bold uppercase">PM Out</th>
              <th className="whitespace-nowrap border border-black px-0.5 py-0.5 font-bold uppercase">Hrs</th>
              <th className="whitespace-nowrap border border-black px-0.5 py-0.5 font-bold uppercase">Min</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const ymd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
              const record = byDate[ymd];
              const slots = record?.slots || {};
              const worked = computeHours(slots);
              const isNotChecked = Boolean(record && record.status !== "checked");
              return (
                <tr key={ymd} className="h-[11px]">
                  <td className={`whitespace-nowrap border border-black px-0.5 py-0.5 text-center font-semibold ${isNotChecked ? "text-red-600" : ""}`}>
                    {sameMonth ? day.getDate() : day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className={`whitespace-nowrap border border-black px-0.5 py-0.5 text-center ${isNotChecked && slots.am_in?.time ? "font-bold text-red-600" : ""}`}>{formatTime(slots.am_in?.time)}</td>
                  <td className={`whitespace-nowrap border border-black px-0.5 py-0.5 text-center ${isNotChecked && slots.am_out?.time ? "font-bold text-red-600" : ""}`}>{formatTime(slots.am_out?.time)}</td>
                  <td className={`whitespace-nowrap border border-black px-0.5 py-0.5 text-center ${isNotChecked && slots.pm_in?.time ? "font-bold text-red-600" : ""}`}>{formatTime(slots.pm_in?.time)}</td>
                  <td className={`whitespace-nowrap border border-black px-0.5 py-0.5 text-center ${isNotChecked && slots.pm_out?.time ? "font-bold text-red-600" : ""}`}>{formatTime(slots.pm_out?.time)}</td>
                  <td className={`whitespace-nowrap border border-black px-0.5 py-0.5 text-center ${isNotChecked && worked ? "font-bold text-red-600" : ""}`}>{worked ? worked.hours : ""}</td>
                  <td className={`whitespace-nowrap border border-black px-0.5 py-0.5 text-center ${isNotChecked && worked ? "font-bold text-red-600" : ""}`}>{worked ? worked.minutes : ""}</td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-bold">
              <td className="whitespace-nowrap border border-black px-0.5 text-center uppercase" colSpan={5}>
                Total
              </td>
              <td className="whitespace-nowrap border border-black px-0.5 text-center">{totalWorked ? totalWorked.hours : ""}</td>
              <td className="whitespace-nowrap border border-black px-0.5 text-center">{totalWorked ? totalWorked.minutes : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="pt-2">
        <p className="text-left text-[7px] italic leading-snug">
          I certify on my honor that the above is a true and correct report of the hours of work performed, record of
          which was made daily at the time of arrival and departure from office.
        </p>

        <div className="mt-3">
          <p className="w-full border-b border-black" />
          <p className="mt-2 text-left text-[8px] uppercase tracking-wider text-gray-600">
            Verified as to the prescribed office hours:
          </p>
          <p className="mt-4 w-full border-b border-black" />
          <p className="mt-1 text-center text-[9px] font-bold uppercase">In Charge</p>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function InstructorInternDtrPrintPage() {
  const { uuid } = useParams();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const [records, setRecords] = useState([]);
  const [internName, setInternName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uuid) return;
    api
      .get(`/instructor/interns/${uuid}`)
      .then((res) => setInternName(res.data.data.full_name || ""))
      .catch(() => setInternName(""));
  }, [uuid]);

  useEffect(() => {
    if (!from || !to || !uuid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get(`/instructor/interns/${uuid}/photo-dtr?from=${from}&to=${to}`)
      .then((res) => setRecords(res.data.data || []))
      .catch((err) => toast.error("Failed to load DTR", { description: firstErrorMessage(err) }))
      .finally(() => {
        setLoading(false);
        if (window.parent !== window) {
          window.parent.postMessage({ type: "smartlog-dtr-print-ready" }, "*");
        }
      });
  }, [from, to, uuid]);

  return (
    <div className="bg-gray-100">
      <style>{`@media print { @page { size: Letter landscape; margin: 4mm; } html, body { margin: 0 !important; padding: 0 !important; } .no-print { display: none !important; } body { background: white !important; } }`}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link
          to={`/instructor/monitoring/${uuid}/dtr-logs?from=${from}&to=${to}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft size={16} /> Back to DTR Logs
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-700"
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : !from || !to ? (
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-gray-600">
          Missing date range. Go back and pick a From/To date.
        </div>
      ) : (
        <div className="mx-auto grid w-full grid-cols-3 gap-1.5 overflow-hidden bg-white p-1.5 print:overflow-hidden">
          <DtrForm records={records} from={from} to={to} name={internName} />
          <DtrForm records={records} from={from} to={to} name={internName} />
          <DtrForm records={records} from={from} to={to} name={internName} />
        </div>
      )}
    </div>
  );
}
