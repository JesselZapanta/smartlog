import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/dates";
import { useAuth } from "@/contexts/AuthContext";

const REPORT_TITLES = {
  overview: "Executive Overview Report",
  dtr: "Photo DTR & DTR Logs Report",
  journals: "Daily Journal Report",
  requirements: "Requirements Report",
};

function StatusBadge({ value }) {
  const colors = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    checked: "bg-green-100 text-green-700",
    submitted: "bg-blue-100 text-blue-700",
    open: "bg-amber-100 text-amber-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-600",
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${colors[String(value)] || "bg-gray-100 text-gray-600"}`}>
      {String(value).replace(/-/g, " ")}
    </span>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mb-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wider text-gray-700">{children}</h2>;
}

function DataTable({ columns, rows }) {
  return (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <tr className="border-b border-gray-300 bg-gray-50">
          {columns.map((col) => (
            <th key={col.key} className={`px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-600 ${col.align === "right" ? "text-right" : ""}`}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-100">
            {columns.map((col) => (
              <td key={col.key} className={`px-2 py-1.5 text-gray-800 ${col.align === "right" ? "text-right font-mono" : ""} ${col.bold ? "font-semibold" : ""}`}>
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="px-2 py-6 text-center text-[10px] text-gray-400">No data</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function miniStatsBox(label, value, tone = "text-gray-900") {
  return (
    <div className="rounded border border-gray-200 p-2 text-center">
      <p className="text-[9px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`font-heading text-base font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function formatTime(value) {
  if (!value) return "—";
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function shouldShow(report, key) {
  return !report || report === "overview" || report === key;
}

export default function InternReportPrintPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const academicYearId = searchParams.get("academic_year_id") || "";
  const report = searchParams.get("report") || "overview";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (academicYearId) params.set("academic_year_id", academicYearId);
    api
      .get(`/intern/reports?${params.toString()}`)
      .then((res) => setData(res.data.data))
      .catch((err) => toast.error("Failed to load report", { description: firstErrorMessage(err) }))
      .finally(() => {
        setLoading(false);
        if (window.parent !== window) {
          window.parent.postMessage({ type: "smartlog-report-print-ready" }, "*");
        }
      });
  }, [academicYearId]);

  const yearLabel = data?.academic_year?.description || data?.academic_year?.code || "All Academic Years";
  const generatedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const title = REPORT_TITLES[report] || "SMARTLOG System Report";
  const preparedName = user?.full_name || [user?.firstname, user?.middlename, user?.lastname, user?.extension].filter(Boolean).join(" ") || "—";

  return (
    <div className="bg-gray-100">
      <style>{`@media print { @page { size: Letter portrait; margin: 8mm; } html, body { margin: 0 !important; padding: 0 !important; } .no-print { display: none !important; } body { background: white !important; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; } }`}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-700"
        >
          Print / Save as PDF
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : !data ? (
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-gray-600">Failed to load report data.</div>
      ) : (
        <div className="mx-auto max-w-[8.5in] bg-white p-6">
          <div className="mb-6 border-b border-gray-200 pb-4 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-green-700">Tangub City Global College</p>
            <h1 className="mt-1 font-heading text-lg font-bold text-gray-900">{title}</h1>
            <p className="text-[10px] text-gray-500">SMARTLOG OJT Monitoring System · {data.intern?.program || "Intern"}</p>
            <p className="mt-2 inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-[10px] font-semibold text-green-700 ring-1 ring-green-100">AY: {yearLabel}</p>
            <p className="mt-1 text-[9px] text-gray-400">Generated: {generatedAt}</p>
          </div>

          <div className="space-y-6">
            {shouldShow(report, "overview") && (
              <div>
                <SectionTitle>Executive Overview</SectionTitle>
                <div className="grid grid-cols-4 gap-2">
                  {miniStatsBox("OJT Hours Earned", `${data.ojt_hours?.earned ?? 0}h`, "text-green-700")}
                  {miniStatsBox("OJT Required", `${data.ojt_hours?.required ?? 0}h`)}
                  {miniStatsBox("DTR Entries", data.dtr.total, "text-teal-700")}
                  {miniStatsBox("Journals", data.journals.total, "text-emerald-700")}
                </div>
                <div className="mt-2">
                  <div className="rounded border border-gray-200 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">OJT Progress · {data.ojt_hours?.earned ?? 0} of {data.ojt_hours?.required ?? 0}h</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full bg-green-600" style={{ width: `${data.ojt_hours?.progress ?? 0}%` }} />
                    </div>
                    <p className="mt-1 text-[9px] text-gray-500">{data.ojt_hours?.progress ?? 0}% completed · {data.ojt_hours?.remaining ?? 0}h remaining</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">DTR by Status</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(data.dtr.by_status || {}).map(([s, c]) => (
                        <span key={s} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[9px]">
                          <StatusBadge value={s} /> <span className="font-mono font-bold">{c}</span>
                        </span>
                      ))}
                      {Object.keys(data.dtr.by_status || {}).length === 0 && <span className="text-[9px] text-gray-400">No DTR</span>}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">Requirements</p>
                    <DataTable
                      columns={[
                        { key: "name", label: "Requirement", bold: true },
                        { key: "approved", label: "Approved", align: "right" },
                      ]}
                      rows={(data.requirements.by_requirement || []).slice(0, 4).map((r) => ({ name: r.name, approved: r.approved }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {shouldShow(report, "dtr") && (
              <div>
                <SectionTitle>Photo DTR & DTR Logs Report</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {miniStatsBox("Total DTR", data.dtr.total, "text-teal-700")}
                  {miniStatsBox("Approved", data.dtr.by_status?.checked || data.dtr.by_status?.approved || 0, "text-green-700")}
                  {miniStatsBox("Pending", data.dtr.by_status?.pending || 0, "text-amber-700")}
                </div>
                <div className="mt-2">
                  <DataTable
                    columns={[
                      { key: "date", label: "Date", bold: true },
                      { key: "am_in", label: "AM In", align: "right" },
                      { key: "am_out", label: "AM Out", align: "right" },
                      { key: "pm_in", label: "PM In", align: "right" },
                      { key: "pm_out", label: "PM Out", align: "right" },
                      { key: "status", label: "Status", align: "right" },
                    ]}
                    rows={(data.dtr.recent || []).map((r) => ({
                      date: formatDate(r.date),
                      am_in: formatTime(r.am_in),
                      am_out: formatTime(r.am_out),
                      pm_in: formatTime(r.pm_in),
                      pm_out: formatTime(r.pm_out),
                      status: r.status,
                    }))}
                  />
                </div>
              </div>
            )}

            {shouldShow(report, "journals") && (
              <div>
                <SectionTitle>Daily Journal Report</SectionTitle>
                <div className="grid grid-cols-2 gap-2">
                  {miniStatsBox("Total Journals", data.journals.total, "text-emerald-700")}
                  {miniStatsBox("OJT Progress", `${data.ojt_hours?.progress ?? 0}%`, "text-green-700")}
                </div>
                <div className="mt-2">
                  <DataTable
                    columns={[
                      { key: "date", label: "Date", bold: true },
                      { key: "title", label: "Title" },
                    ]}
                    rows={(data.journals.recent || []).map((r) => ({ date: formatDate(r.date), title: r.title || "Untitled" }))}
                  />
                </div>
              </div>
            )}

            {shouldShow(report, "requirements") && (
              <div>
                <SectionTitle>Requirements Report</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {miniStatsBox("Types", data.requirements.definitions_total)}
                  {miniStatsBox("Submissions", data.requirements.total)}
                  {miniStatsBox("Approved", data.requirements.by_status.approved || 0, "text-green-700")}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(data.requirements.by_status).map(([s, c]) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[9px]">
                      <StatusBadge value={s} /> <span className="font-mono font-bold">{c}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">Compliance per Requirement</p>
                  <DataTable
                    columns={[
                      { key: "name", label: "Requirement", bold: true },
                      { key: "type", label: "Type" },
                      { key: "pending", label: "Pending", align: "right" },
                      { key: "approved", label: "Approved", align: "right" },
                      { key: "total", label: "Total", align: "right" },
                    ]}
                    rows={(data.requirements.by_requirement || []).map((r) => ({ name: r.name, type: r.type, pending: r.pending, approved: r.approved, total: r.total }))}
                  />
                </div>
              </div>
            )}

            <div className="mt-10 flex justify-end break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
              <div className="w-[42%] text-[9px] sm:w-[36%] sm:text-xs" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                <p className="text-gray-600">Prepared by:</p>
                <div className="mt-8 border-b border-gray-800 sm:mt-12" />
                <p className="mt-1.5 text-center font-heading text-[10px] font-bold uppercase tracking-wide text-gray-900 sm:text-xs">{preparedName}</p>
                <p className="text-center text-[9px] text-gray-500 sm:text-[10px]">Intern</p>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-3 text-center text-[8px] text-gray-400">
              <p>SMARTLOG OJT Monitoring System · Tangub City Global College · Confidential</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
