import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";

const REPORT_TITLES = {
  overview: "Executive Overview Report",
  registrations: "Intern Registrations Report",
  placement: "HTE Placement Report",
  requirements: "Requirements Compliance Report",
  dtr: "Attendance & DTR Report",
  issues: "Issues & Evaluations Report",
};

function StatusBadge({ value }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase text-gray-700">
      {String(value).replace(/[-_]/g, " ")}
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
                {row[col.key]}
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

function shouldShow(report, key) {
  return !report || report === "overview" || report === key;
}

export default function CoordinatorReportPrintPage() {
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
      .get(`/coordinator/reports?${params.toString()}`)
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
  const instituteLabel = data?.institute?.name || "All Institutes";
  const generatedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const title = REPORT_TITLES[report] || "Coordinator Report";

  return (
    <div className="bg-gray-100">
      <style>{`@media print { @page { size: Letter portrait; margin: 8mm; } html, body { margin: 0 !important; padding: 0 !important; } .no-print { display: none !important; } body { background: white !important; } }`}</style>

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
            <p className="text-[10px] text-gray-500">SMARTLOG OJT Monitoring System</p>
            <p className="mt-2 inline-flex flex-wrap items-center justify-center gap-1.5">
              <span className="rounded-full bg-green-50 px-3 py-1 text-[10px] font-semibold text-green-700 ring-1 ring-green-100">{instituteLabel}</span>
              <span className="rounded-full bg-gray-50 px-3 py-1 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200">AY: {yearLabel}</span>
            </p>
            <p className="mt-1 text-[9px] text-gray-400">Generated: {generatedAt}</p>
          </div>

          <div className="space-y-6">
            {shouldShow(report, "registrations") && (
              <div>
                <SectionTitle>Intern Registration Summary</SectionTitle>
                <div className="grid grid-cols-4 gap-2">
                  {miniStatsBox("Total", data.interns.total)}
                  {miniStatsBox("Approved", data.interns.approved, "text-green-700")}
                  {miniStatsBox("Pending", data.interns.pending, "text-amber-700")}
                  {miniStatsBox("Rejected", data.interns.rejected, "text-red-700")}
                </div>
                <div className="mt-2">
                  <DataTable
                    columns={[{ key: "program", label: "Program", bold: true }, { key: "count", label: "Interns", align: "right" }]}
                    rows={data.interns.by_program.map((r) => ({ program: r.program, count: r.total }))}
                  />
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">OJT Deployment Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.interns.by_ojt_status).map(([s, c]) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[9px]">
                        <StatusBadge value={s} /> <span className="font-mono font-bold">{c}</span>
                      </span>
                    ))}
                    {Object.keys(data.interns.by_ojt_status).length === 0 && <span className="text-[10px] text-gray-400">No deployment data</span>}
                  </div>
                </div>
              </div>
            )}

            {shouldShow(report, "placement") && (
              <div>
                <SectionTitle>HTE Placement Summary</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {miniStatsBox("Total HTEs", data.htes.total)}
                  {miniStatsBox("Active", data.htes.active, "text-green-700")}
                  {miniStatsBox("Inactive", data.htes.inactive)}
                </div>
                <div className="mt-2">
                  <DataTable
                    columns={[
                      { key: "name", label: "Host Training Establishment", bold: true },
                      { key: "status", label: "Status" },
                      { key: "count", label: "Assigned Interns", align: "right" },
                    ]}
                    rows={data.htes.top_htes.map((r) => ({ name: r.name, status: r.status, count: r.total }))}
                  />
                </div>
              </div>
            )}

            {shouldShow(report, "requirements") && (
              <div>
                <SectionTitle>Requirements Compliance</SectionTitle>
                <div className="grid grid-cols-4 gap-2">
                  {miniStatsBox("Types", data.requirements.definitions_total)}
                  {miniStatsBox("Submissions", data.requirements.total)}
                  {miniStatsBox("Approved", data.requirements.by_status.approved || 0, "text-green-700")}
                  {miniStatsBox("Pending", data.requirements.by_status.pending || 0, "text-amber-700")}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(data.requirements.by_status).map(([s, c]) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[9px]">
                      <StatusBadge value={s} /> <span className="font-mono font-bold">{c}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {shouldShow(report, "dtr") && (
              <div>
                <SectionTitle>Attendance & DTR</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {miniStatsBox("DTR Submissions", data.dtr.total)}
                  {miniStatsBox("Journals", data.journals.total)}
                  {miniStatsBox("Evaluations", data.evaluations.intern_ratings + data.evaluations.hte_ratings)}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(data.dtr.by_status).map(([s, c]) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[9px]">
                      <StatusBadge value={s} /> <span className="font-mono font-bold">{c}</span>
                    </span>
                  ))}
                  {Object.keys(data.dtr.by_status).length === 0 && <span className="text-[10px] text-gray-400">No DTR data</span>}
                </div>
              </div>
            )}

            {shouldShow(report, "issues") && (
              <div>
                <SectionTitle>Issues & Evaluations</SectionTitle>
                <div className="grid grid-cols-4 gap-2">
                  {miniStatsBox("Issues", data.issues.total, "text-red-700")}
                  {miniStatsBox("Open", data.issues.by_status.pending || 0, "text-amber-700")}
                  {miniStatsBox("Resolved", data.issues.by_status.resolve || 0, "text-green-700")}
                  {miniStatsBox("Ratings", data.evaluations.intern_ratings + data.evaluations.hte_ratings)}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <DataTable
                    columns={[{ key: "status", label: "Issue Status", bold: true }, { key: "count", label: "Count", align: "right" }]}
                    rows={Object.entries(data.issues.by_status).map(([s, c]) => ({ status: s, count: c }))}
                  />
                  <DataTable
                    columns={[
                      { key: "type", label: "Evaluation Type", bold: true },
                      { key: "count", label: "Count", align: "right" },
                    ]}
                    rows={[
                      { type: "Intern rated HTE", count: data.evaluations.intern_ratings },
                      { type: "HTE rated Intern", count: data.evaluations.hte_ratings },
                    ]}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-gray-200 pt-3 text-center text-[8px] text-gray-400">
              <p>SMARTLOG OJT Monitoring System · Tangub City Global College · Confidential</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
