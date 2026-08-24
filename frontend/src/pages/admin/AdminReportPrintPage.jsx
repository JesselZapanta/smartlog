import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { useAuth } from "@/contexts/AuthContext";

const REPORT_TITLES = {
  overview: "Executive Overview Report",
  interns: "Intern Deployment Report",
  htes: "HTE Partners Report",
  academic: "Academic Setup Report",
  requirements: "Requirements Compliance Report",
  dtr: "Attendance & DTR Report",
  users: "User Accounts Report",
  issues: "Issues & Evaluations Report",
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
    deployed: "bg-green-100 text-green-700",
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

function shouldShow(report, key) {
  return !report || report === "overview" || report === key;
}

export default function AdminReportPrintPage() {
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
      .get(`/reports?${params.toString()}`)
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
            <p className="text-[10px] text-gray-500">SMARTLOG OJT Monitoring System</p>
            <p className="mt-2 inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-[10px] font-semibold text-green-700 ring-1 ring-green-100">AY: {yearLabel}</p>
            <p className="mt-1 text-[9px] text-gray-400">Generated: {generatedAt}</p>
          </div>

          <div className="space-y-6">
            {shouldShow(report, "overview") && (
              <div>
                <SectionTitle>Executive Overview</SectionTitle>
                <div className="grid grid-cols-4 gap-2">
                  {miniStatsBox("Total Users", data.users.total)}
                  {miniStatsBox("Total Interns", data.interns.total, "text-green-700")}
                  {miniStatsBox("HTE Partners", data.htes.total, "text-blue-700")}
                  {miniStatsBox("DTR Submissions", data.dtr.total, "text-teal-700")}
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {miniStatsBox("Journals", data.journals.total)}
                  {miniStatsBox("Requirements", data.requirements.total)}
                  {miniStatsBox("Issues", data.issues.total, "text-red-700")}
                  {miniStatsBox("Evaluations", data.evaluations.total)}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <DataTable
                    columns={[{ key: "role", label: "Role", bold: true }, { key: "count", label: "Count", align: "right" }]}
                    rows={Object.entries(data.users.by_role).map(([role, count]) => ({ role: role.replace(/_/g, " "), count }))}
                  />
                  <DataTable
                    columns={[{ key: "institute", label: "Institute", bold: true }, { key: "count", label: "Count", align: "right" }]}
                    rows={data.interns.by_institute.map((r) => ({ institute: r.institute, count: r.total }))}
                  />
                </div>
              </div>
            )}

            {shouldShow(report, "interns") && (
              <div>
                <SectionTitle>Intern Deployment Report</SectionTitle>
                <div className="grid grid-cols-4 gap-2">
                  {miniStatsBox("Total", data.interns.total)}
                  {miniStatsBox("Approved", data.interns.approved, "text-green-700")}
                  {miniStatsBox("Pending", data.interns.pending, "text-amber-700")}
                  {miniStatsBox("Rejected", data.interns.rejected, "text-red-700")}
                </div>
                <div className="mt-2">
                  <DataTable
                    columns={[{ key: "institute", label: "Institute", bold: true }, { key: "count", label: "Count", align: "right" }]}
                    rows={data.interns.by_institute.map((r) => ({ institute: r.institute, count: r.total }))}
                  />
                </div>
                <div className="mt-2">
                  <DataTable
                    columns={[{ key: "program", label: "Program", bold: true }, { key: "count", label: "Count", align: "right" }]}
                    rows={data.interns.by_program.map((r) => ({ program: r.program, count: r.total }))}
                  />
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">OJT Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.interns.by_ojt_status).map(([s, c]) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[9px]">
                        <StatusBadge value={s} /> <span className="font-mono font-bold">{c}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {shouldShow(report, "htes") && (
              <div>
                <SectionTitle>HTE Partners Report</SectionTitle>
                <div className="mb-2 grid grid-cols-3 gap-2">
                  {miniStatsBox("Total HTEs", data.htes.total)}
                  {miniStatsBox("Institutes", data.institutes.total)}
                  {miniStatsBox("Programs", data.programs.total)}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(data.htes.by_status).map(([s, c]) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[9px]">
                      <StatusBadge value={s} /> <span className="font-mono font-bold">{c}</span>
                    </span>
                  ))}
                  {Object.keys(data.htes.by_status).length === 0 && <span className="text-[10px] text-gray-400">No HTE data</span>}
                </div>
                <div className="mt-3">
                  <DataTable
                    columns={[
                      { key: "name", label: "Institute", bold: true },
                      { key: "programs", label: "Programs", align: "right" },
                      { key: "status", label: "Status", align: "right" },
                    ]}
                    rows={(data.institutes.list || []).map((r) => ({ name: r.name, programs: r.programs_count, status: r.is_active ? "active" : "inactive" }))}
                  />
                </div>
              </div>
            )}

            {shouldShow(report, "academic") && (
              <div>
                <SectionTitle>Academic Setup Report</SectionTitle>
                <div className="grid grid-cols-4 gap-2">
                  {miniStatsBox("Institutes", data.institutes.total)}
                  {miniStatsBox("Programs", data.programs.total)}
                  {miniStatsBox("Academic Years", data.academic_terms.total)}
                  {miniStatsBox("OJT Configs", (data.ojt_hours || []).length)}
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">Academic Years</p>
                  <DataTable
                    columns={[
                      { key: "code", label: "Code", bold: true },
                      { key: "desc", label: "Description" },
                      { key: "status", label: "Status" },
                    ]}
                    rows={(data.academic_terms.list || []).map((r) => ({ code: r.code, desc: r.description, status: r.status }))}
                  />
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">Programs</p>
                  <DataTable
                    columns={[
                      { key: "program", label: "Program", bold: true },
                      { key: "institute", label: "Institute" },
                      { key: "status", label: "Status" },
                    ]}
                    rows={(data.programs_list || []).map((r) => ({ program: r.name, institute: r.institute?.name || "—", status: r.is_active ? "active" : "inactive" }))}
                  />
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">OJT Hours</p>
                  <DataTable
                    columns={[
                      { key: "institute", label: "Institute", bold: true },
                      { key: "hours", label: "Hours", align: "right" },
                    ]}
                    rows={(data.ojt_hours || []).map((r) => ({ institute: r.institute?.name || "—", hours: r.hours }))}
                  />
                </div>
              </div>
            )}

            {shouldShow(report, "requirements") && (
              <div>
                <SectionTitle>Requirements Compliance Report</SectionTitle>
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
              </div>
            )}

            {shouldShow(report, "dtr") && (
              <div>
                <SectionTitle>Attendance & DTR Report</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {miniStatsBox("DTR Submissions", data.dtr.total)}
                  {miniStatsBox("Journals", data.journals.total)}
                  {miniStatsBox("Evaluations", data.evaluations.total)}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(data.dtr.by_status).map(([s, c]) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[9px]">
                      <StatusBadge value={s} /> <span className="font-mono font-bold">{c}</span>
                    </span>
                  ))}
                  {Object.keys(data.dtr.by_status).length === 0 && <span className="text-[10px] text-gray-400">No DTR data</span>}
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">OJT Hours per Institute</p>
                  <DataTable
                    columns={[
                      { key: "institute", label: "Institute", bold: true },
                      { key: "hours", label: "Required Hours", align: "right" },
                    ]}
                    rows={(data.ojt_hours || []).map((r) => ({ institute: r.institute?.name || "—", hours: r.hours }))}
                  />
                </div>
              </div>
            )}

            {shouldShow(report, "users") && (
              <div>
                <SectionTitle>User Accounts Report</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {miniStatsBox("Total Users", data.users.total)}
                  {miniStatsBox("Verified", data.users.verified, "text-green-700")}
                  {miniStatsBox("Unverified", data.users.unverified, "text-amber-700")}
                </div>
                <div className="mt-2">
                  <DataTable
                    columns={[{ key: "role", label: "Role", bold: true }, { key: "count", label: "Count", align: "right" }]}
                    rows={Object.entries(data.users.by_role).map(([role, count]) => ({ role: role.replace(/_/g, " "), count }))}
                  />
                </div>
              </div>
            )}

            {shouldShow(report, "issues") && (
              <div>
                <SectionTitle>Issues & Evaluations Report</SectionTitle>
                <div className="grid grid-cols-4 gap-2">
                  {miniStatsBox("Issues", data.issues.total, "text-red-700")}
                  {miniStatsBox("Open", data.issues.by_status.open || 0, "text-amber-700")}
                  {miniStatsBox("Resolved", data.issues.by_status.resolved || 0, "text-green-700")}
                  {miniStatsBox("Evaluations", data.evaluations.total)}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <DataTable
                    columns={[{ key: "status", label: "Status", bold: true }, { key: "count", label: "Count", align: "right" }]}
                    rows={Object.entries(data.issues.by_status).map(([s, c]) => ({ status: s, count: c }))}
                  />
                  <DataTable
                    columns={[{ key: "type", label: "Type", bold: true }, { key: "count", label: "Count", align: "right" }]}
                    rows={Object.entries(data.issues.by_type).map(([t, c]) => ({ type: (t || "N/A").replace(/_/g, " "), count: c }))}
                  />
                </div>
              </div>
            )}

            <div className="mt-10 flex justify-end break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
              <div className="w-[42%] text-[9px] sm:w-[36%] sm:text-xs" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                <p className="text-gray-600">Prepared by:</p>
                <div className="mt-8 border-b border-gray-800 sm:mt-12" />
                <p className="mt-1.5 text-center font-heading text-[10px] font-bold uppercase tracking-wide text-gray-900 sm:text-xs">{preparedName}</p>
                <p className="text-center text-[9px] text-gray-500 sm:text-[10px]">Administrator</p>
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
