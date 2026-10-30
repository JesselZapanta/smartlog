import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { useAuth } from "@/contexts/AuthContext";

const REPORT_TITLES = {
  overview: "Executive Overview Report",
  registrations: "Intern Registrations Report",
  placement: "HTE Placement Report",
  requirements: "Requirements Compliance Report",
  dtr: "Attendance & DTR Report",
  issues: "Issues & Concerns Report",
  evaluations: "Evaluations Report",
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

  const coordinatorName =
    user?.full_name || [user?.firstname, user?.middlename, user?.lastname, user?.extension].filter(Boolean).join(" ") || "—";

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
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">Intern Roster</p>
                  <DataTable
                    columns={[
                      { key: "name", label: "Student", bold: true },
                      { key: "program", label: "Program" },
                      { key: "hte", label: "Host Training Establishment" },
                      { key: "status", label: "Status" },
                      { key: "ojt", label: "OJT Status" },
                    ]}
                    rows={(data.interns.rows || []).map((r) => ({ name: r.name, program: r.program, hte: r.hte, status: r.status, ojt: r.ojt_status }))}
                  />
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
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(data.htes.by_status || {}).map(([s, c]) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[9px]">
                      <StatusBadge value={s} /> <span className="font-mono font-bold">{c}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">HTEs — Assignment Load</p>
                  <DataTable
                    columns={[
                      { key: "name", label: "Host Training Establishment", bold: true },
                      { key: "status", label: "Status" },
                      { key: "assigned", label: "Assigned", align: "right" },
                      { key: "interns", label: "Interns Assigned" },
                    ]}
                    rows={(data.htes.detail || []).map((h) => ({
                      name: h.name,
                      status: h.status,
                      assigned: h.assigned,
                      interns: (h.interns || []).join(", ") || "—",
                    }))}
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
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">Submissions</p>
                  <DataTable
                    columns={[
                      { key: "student", label: "Student", bold: true },
                      { key: "requirement", label: "Requirement" },
                      { key: "type", label: "Type" },
                      { key: "status", label: "Status" },
                      { key: "submitted_at", label: "Submitted" },
                      { key: "reviewed_at", label: "Reviewed" },
                    ]}
                    rows={(data.requirements.rows || []).map((r) => ({
                      student: r.student,
                      requirement: r.requirement,
                      type: r.type,
                      status: r.status,
                      submitted_at: r.submitted_at || "—",
                      reviewed_at: r.reviewed_at || "—",
                    }))}
                  />
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
                  {Object.entries(data.dtr.by_status || {}).map(([s, c]) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[9px]">
                      <StatusBadge value={s} /> <span className="font-mono font-bold">{c}</span>
                    </span>
                  ))}
                  {Object.keys(data.dtr.by_status || {}).length === 0 && <span className="text-[10px] text-gray-400">No DTR data</span>}
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">DTR Records</p>
                  <DataTable
                    columns={[
                      { key: "student", label: "Student", bold: true },
                      { key: "date", label: "Date" },
                      { key: "am_in", label: "AM In" },
                      { key: "am_out", label: "AM Out" },
                      { key: "pm_in", label: "PM In" },
{ key: "pm_out", label: "PM Out" },
                      { key: "status", label: "Status" },
                    ]}
                    rows={(data.dtr.rows || []).map((r) => ({ student: r.student, date: r.date, am_in: r.am_in || "-", am_out: r.am_out || "-", pm_in: r.pm_in || "-", pm_out: r.pm_out || "-", status: r.status }))}
                  />
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">Journal Records</p>
                  <DataTable
                    columns={[
                      { key: "student", label: "Student", bold: true },
                      { key: "date", label: "Date" },
                      { key: "title", label: "Title", bold: true },
                      { key: "status", label: "Status" },
                    ]}
                    rows={(data.journals.rows || []).map((r) => ({ student: r.student, date: r.date, title: r.title, status: r.status }))}
                  />
                </div>
              </div>
            )}

            {shouldShow(report, "issues") && (
              <div>
                <SectionTitle>Issues & Concerns</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {miniStatsBox("Total Concerns", data.issues.total, "text-red-700")}
                  {miniStatsBox("Pending", data.issues.by_status.pending || 0, "text-amber-700")}
                  {miniStatsBox("Resolved", data.issues.by_status.resolve || 0, "text-green-700")}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <DataTable
                    columns={[{ key: "direction", label: "Concern Direction", bold: true }, { key: "count", label: "Count", align: "right" }]}
                    rows={[
                      { direction: "Raised by Intern", count: data.issues.by_type.intern || 0 },
                      { direction: "Raised by HTE", count: data.issues.by_type.hte || 0 },
                    ]}
                  />
                  <DataTable
                    columns={[{ key: "status", label: "Concern Status", bold: true }, { key: "count", label: "Count", align: "right" }]}
                    rows={Object.entries(data.issues.by_status).map(([s, c]) => ({ status: s, count: c }))}
                  />
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">All Concerns</p>
                  <DataTable
                    columns={[
                      { key: "student", label: "Student", bold: true },
                      { key: "hte", label: "HTE" },
                      { key: "direction", label: "Raised By" },
                      { key: "issues", label: "Issue" },
                      { key: "solutions", label: "Solution" },
                      { key: "recommendations", label: "Recommendation" },
                      { key: "status", label: "Status" },
                    ]}
                    rows={(data.issues.rows || []).map((r) => ({
                      student: r.student,
                      hte: r.hte,
                      direction: r.direction,
                      issues: r.issues || "—",
                      solutions: r.solutions || "—",
                      recommendations: r.recommendations || "—",
                      status: r.status,
                    }))}
                  />
                </div>
              </div>
            )}

            {shouldShow(report, "evaluations") && (
              <div>
                <SectionTitle>Evaluations</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {miniStatsBox("Total Ratings", data.evaluations.total ?? (data.evaluations.intern_ratings + data.evaluations.hte_ratings), "text-amber-700")}
                  {miniStatsBox("Intern → HTE", data.evaluations.intern_ratings, "text-purple-700")}
                  {miniStatsBox("HTE → Intern", data.evaluations.hte_ratings, "text-blue-700")}
                </div>
                <div className="mt-2">
                  <DataTable
                    columns={[{ key: "type", label: "Evaluation Type", bold: true }, { key: "count", label: "Count", align: "right" }]}
                    rows={[
                      { type: "Intern rated HTE", count: data.evaluations.intern_ratings },
                      { type: "HTE rated Intern", count: data.evaluations.hte_ratings },
                    ]}
                  />
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">Evaluation Summary per Intern</p>
                  <DataTable
                    columns={[
                      { key: "student", label: "Student", bold: true },
                      { key: "hte", label: "Host Training Establishment" },
                      { key: "intern_rated", label: "Intern Ratings", align: "right" },
                      { key: "intern_average", label: "Intern Avg", align: "right" },
                      { key: "hte_rated", label: "HTE Ratings", align: "right" },
                      { key: "hte_average", label: "HTE Avg", align: "right" },
                    ]}
                    rows={(data.evaluations.rows || []).map((r) => ({
                      student: r.student,
                      hte: r.hte,
                      intern_rated: r.intern_rated,
                      intern_average: r.intern_average ?? "—",
                      hte_rated: r.hte_rated,
                      hte_average: r.hte_average ?? "—",
                    }))}
                  />
                </div>
              </div>
            )}

            <div className="mt-10 flex justify-end break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
              <div className="w-[42%] text-[9px] sm:w-[36%] sm:text-xs" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                <p className="text-gray-600">Prepared by:</p>
                <div className="mt-8 border-b border-gray-800 sm:mt-12" />
                <p className="mt-1.5 text-center font-heading text-[10px] font-bold uppercase tracking-wide text-gray-900 sm:text-xs">{coordinatorName}</p>
                <p className="text-center text-[9px] text-gray-500 sm:text-[10px]">{instituteLabel !== "All Institutes" ? `${instituteLabel} OJT Coordinator` : "OJT Coordinator"}</p>
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
