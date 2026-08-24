import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";

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
    "in-progress": "bg-blue-100 text-blue-700",
    deployed: "bg-green-100 text-green-700",
    "not-deployed": "bg-gray-100 text-gray-600",
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${colors[value] || "bg-gray-100 text-gray-600"}`}>
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

function StatusTable({ byStatus }) {
  const entries = Object.entries(byStatus || {});
  if (entries.length === 0) return <p className="py-2 text-[10px] text-gray-400">No data</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([status, count]) => (
        <div key={status} className="flex items-center gap-1.5 rounded border border-gray-200 px-2 py-1">
          <StatusBadge value={status} />
          <span className="font-mono text-[10px] font-bold text-gray-800">{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminReportPrintPage() {
  const [searchParams] = useSearchParams();
  const academicYearId = searchParams.get("academic_year_id") || "";
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
          <div className="mb-6 text-center">
            <h1 className="font-heading text-lg font-bold text-gray-900">SMARTLOG System Report</h1>
            <p className="text-[10px] text-gray-500">Tangub City Global College</p>
            <p className="mt-1 text-[10px] text-gray-600">Academic Year: <strong>{yearLabel}</strong></p>
            <p className="text-[9px] text-gray-400">Generated: {generatedAt}</p>
          </div>

          <div className="space-y-5">
            <div>
              <SectionTitle>User Summary</SectionTitle>
              <div className="grid grid-cols-3 gap-3 text-[10px]">
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Total Users</p>
                  <p className="font-heading text-base font-bold text-gray-900">{data.users.total}</p>
                </div>
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Verified</p>
                  <p className="font-heading text-base font-bold text-green-700">{data.users.verified}</p>
                </div>
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Unverified</p>
                  <p className="font-heading text-base font-bold text-amber-700">{data.users.unverified}</p>
                </div>
              </div>
              <div className="mt-2">
                <DataTable
                  columns={[
                    { key: "role", label: "Role", bold: true },
                    { key: "count", label: "Count", align: "right" },
                  ]}
                  rows={Object.entries(data.users.by_role).map(([role, count]) => ({
                    role: role.replace(/_/g, " "),
                    count,
                  }))}
                />
              </div>
            </div>

            <div>
              <SectionTitle>Intern Summary</SectionTitle>
              <div className="grid grid-cols-4 gap-2 text-[10px]">
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Total</p>
                  <p className="font-heading text-base font-bold text-gray-900">{data.interns.total}</p>
                </div>
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Approved</p>
                  <p className="font-heading text-base font-bold text-green-700">{data.interns.approved}</p>
                </div>
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Pending</p>
                  <p className="font-heading text-base font-bold text-amber-700">{data.interns.pending}</p>
                </div>
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Rejected</p>
                  <p className="font-heading text-base font-bold text-red-700">{data.interns.rejected}</p>
                </div>
              </div>
              <div className="mt-2">
                <DataTable
                  columns={[
                    { key: "institute", label: "Institute", bold: true },
                    { key: "count", label: "Count", align: "right" },
                  ]}
                  rows={data.interns.by_institute.map((r) => ({
                    institute: r.institute,
                    count: r.total,
                  }))}
                />
              </div>
              <div className="mt-2">
                <DataTable
                  columns={[
                    { key: "program", label: "Program", bold: true },
                    { key: "count", label: "Count", align: "right" },
                  ]}
                  rows={data.interns.by_program.map((r) => ({
                    program: r.program,
                    count: r.total,
                  }))}
                />
              </div>
              <div className="mt-2">
                <p className="mb-1 text-[9px] font-bold uppercase text-gray-500">OJT Status</p>
                <StatusTable byStatus={data.interns.by_ojt_status} />
              </div>
            </div>

            <div>
              <SectionTitle>HTE Summary</SectionTitle>
              <div className="mb-2 flex gap-3 text-[10px]">
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Total HTEs</p>
                  <p className="font-heading text-base font-bold text-gray-900">{data.htes.total}</p>
                </div>
              </div>
              <StatusTable byStatus={data.htes.by_status} />
            </div>

            <div>
              <SectionTitle>Photo DTR Summary</SectionTitle>
              <div className="mb-2 flex gap-3 text-[10px]">
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Total Submissions</p>
                  <p className="font-heading text-base font-bold text-gray-900">{data.dtr.total}</p>
                </div>
              </div>
              <StatusTable byStatus={data.dtr.by_status} />
            </div>

            <div>
              <SectionTitle>Requirements Summary</SectionTitle>
              <div className="mb-2 flex gap-3 text-[10px]">
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Total Submissions</p>
                  <p className="font-heading text-base font-bold text-gray-900">{data.requirements.total}</p>
                </div>
              </div>
              <StatusTable byStatus={data.requirements.by_status} />
            </div>

            <div>
              <SectionTitle>Issues Summary</SectionTitle>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Total</p>
                  <p className="font-heading text-base font-bold text-gray-900">{data.issues.total}</p>
                </div>
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Open</p>
                  <p className="font-heading text-base font-bold text-amber-700">{data.issues.by_status.open || 0}</p>
                </div>
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Resolved</p>
                  <p className="font-heading text-base font-bold text-green-700">{data.issues.by_status.resolved || 0}</p>
                </div>
              </div>
              <div className="mt-2">
                <DataTable
                  columns={[
                    { key: "type", label: "Type", bold: true },
                    { key: "count", label: "Count", align: "right" },
                  ]}
                  rows={Object.entries(data.issues.by_type).map(([type, count]) => ({
                    type: (type || "N/A").replace(/_/g, " "),
                    count,
                  }))}
                />
              </div>
            </div>

            <div>
              <SectionTitle>Programs &amp; Evaluations</SectionTitle>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Total Programs</p>
                  <p className="font-heading text-base font-bold text-gray-900">{data.programs.total}</p>
                </div>
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Total Evaluations</p>
                  <p className="font-heading text-base font-bold text-gray-900">{data.evaluations.total}</p>
                </div>
                <div className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-[9px] uppercase text-gray-500">Journals</p>
                  <p className="font-heading text-base font-bold text-gray-900">{data.journals.total}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-3 text-center text-[8px] text-gray-400">
              <p>SMARTLOG OJT Monitoring System &middot; Tangub City Global College</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
