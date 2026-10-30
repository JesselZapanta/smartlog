import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Printer } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Annex C — "Issues and Concerns Encountered / Solutions / Recommendations",
 * HTE edition.
 *
 * Same HEI Annex C layout the coordinator portal uses: SIPP title block,
 * HEI / address / degree program fields, one three-column table holding every
 * concern, then the PREPARED signatory.
 *
 * The HEI's CERTIFIED CORRECT (Dean) block is omitted, and PREPARED is signed
 * by the establishment's own representative rather than the OJT coordinator.
 */
export default function HteIssuesConcernsPrintPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const academicYearId = searchParams.get("academic_year_id") || "";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (academicYearId) params.set("academic_year_id", academicYearId);
    api
      .get(`/hte/reports?${params.toString()}`)
      .then((res) => setData(res.data.data))
      .catch((err) => toast.error("Failed to load report", { description: firstErrorMessage(err) }))
      .finally(() => {
        setLoading(false);
        if (window.parent !== window) {
          window.parent.postMessage({ type: "smartlog-report-print-ready" }, "*");
        }
      });
  }, [academicYearId]);

  const contactName =
    data?.hte?.contact_name ||
    user?.full_name ||
    [user?.firstname, user?.middlename, user?.lastname, user?.extension].filter(Boolean).join(" ") ||
    "—";

  const heiLabel = data?.hte?.name || "—";
  const instituteLabel = data?.institute?.name || "—";
  const programLabel = data?.hte?.program || "—";
  const ayLabel = data?.academic_year?.description || data?.academic_year?.code || "—";
  const rows = data?.issues?.rows || [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Loader2 size={28} className="animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="bg-gray-100">
      <style>{`@media print { @page { size: Letter portrait; margin: 12mm; } html, body { margin: 0 !important; padding: 0 !important; } .no-print { display: none !important; } body { background: white !important; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } thead { display: table-header-group; } tr, td { break-inside: avoid; page-break-inside: avoid; } }`}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700"
        >
          <Printer size={15} /> Print / Save as PDF
        </button>
        <span className="absolute right-4 text-xs text-gray-400">Form for HEI · Annex C</span>
      </div>

      <div className="mx-auto my-6 w-full max-w-[820px] bg-white p-8 shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <div className="text-center">
          <h1 className="text-[13px] font-bold uppercase leading-tight text-gray-900 sm:text-sm">
            Annual Report in the Implementation of
          </h1>
          <h1 className="text-[13px] font-bold uppercase leading-tight text-gray-900 sm:text-sm">
            Student Internship Program in the Philippines (SIPP)
          </h1>
          <p className="mt-2 text-[11px] font-semibold text-gray-800 sm:text-xs">AY. {ayLabel}</p>
        </div>

        <div className="mt-6 space-y-2 text-[10px] leading-relaxed text-gray-900 sm:text-[11px]">
          <p>
            <span className="font-bold">HEI:</span> {heiLabel}
          </p>
          <p>
            <span className="font-bold">ADDRESS:</span> {data?.hte?.address || "—"}
          </p>
          <p>
            <span className="font-bold">DEGREE PROGRAM:</span> {programLabel}
          </p>
          <p>
            <span className="font-bold">INSTITUTE:</span> {instituteLabel}
          </p>
        </div>

        <table className="mt-5 w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="w-[34%] border border-gray-700 bg-gray-100 px-2 py-2 text-left align-top text-[9px] font-bold uppercase tracking-wide text-gray-800 sm:text-[10px]">
                Issues and Concerns Encountered
              </th>
              <th className="w-[33%] border border-gray-700 bg-gray-100 px-2 py-2 text-left align-top text-[9px] font-bold uppercase tracking-wide text-gray-800 sm:text-[10px]">
                Solutions
              </th>
              <th className="w-[33%] border border-gray-700 bg-gray-100 px-2 py-2 text-left align-top text-[9px] font-bold uppercase tracking-wide text-gray-800 sm:text-[10px]">
                Recommendations
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="border border-gray-700 px-2 py-6 text-center text-gray-400">
                  No issues and concerns recorded for this academic year.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="border border-gray-700 px-2 py-2 align-top">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                    {row.direction}-raised · {row.student}
                  </p>
                  <p className="mt-0.5 text-gray-900">{row.issues || "—"}</p>
                  <p className="mt-1 text-[9px] text-gray-500">{row.created_at}</p>
                </td>
                <td className="border border-gray-700 px-2 py-2 align-top text-gray-900">{row.solutions || "—"}</td>
                <td className="border border-gray-700 px-2 py-2 align-top text-gray-900">{row.recommendations || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-10 w-[46%] break-inside-avoid" style={{ breakInside: "avoid" }}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-900 sm:text-[11px]">PREPARED:</p>
          <div className="mt-10 border-b border-gray-800 sm:mt-12" />
          <p className="mt-1.5 text-center font-heading text-[10px] font-bold uppercase tracking-wide text-gray-900 sm:text-xs">
            {contactName}
          </p>
          <p className="text-center text-[9px] text-gray-500 sm:text-[10px]">{heiLabel}</p>
        </div>
      </div>
    </div>
  );
}