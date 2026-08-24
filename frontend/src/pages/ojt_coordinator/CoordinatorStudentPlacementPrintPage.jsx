import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";

export default function CoordinatorStudentPlacementPrintPage() {
  const [searchParams] = useSearchParams();
  const academicYearId = searchParams.get("academic_year_id") || "";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (academicYearId) params.set("academic_year_id", academicYearId);
    api
      .get(`/coordinator/reports/placement?${params.toString()}`)
      .then((res) => setData(res.data.data))
      .catch((err) => toast.error("Failed to load placement report", { description: firstErrorMessage(err) }))
      .finally(() => {
        setLoading(false);
        if (window.parent !== window) {
          window.parent.postMessage({ type: "smartlog-placement-print-ready" }, "*");
        }
      });
  }, [academicYearId]);

  const ayLabel = data?.academic_year?.description || data?.academic_year?.code || "—";
  const instituteName = data?.institute?.name || "Institute";
  const coordinatorName = data?.coordinator_name || "";
  const rows = data?.rows || [];

  return (
    <div className="bg-[#f3f4f6]">
      <style>{`@media print { @page { size: Legal landscape; margin: 10mm 8mm 12mm 8mm; } html, body { margin: 0 !important; padding: 0 !important; background: white !important; } .no-print { display: none !important; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; } }`}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-center border-b border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
        >
          Print / Save as PDF
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center bg-white py-24">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : !data ? (
        <div className="mx-auto max-w-md bg-white px-6 py-24 text-center text-sm text-gray-600">Failed to load placement data.</div>
      ) : (
        <div className="mx-auto max-w-[13.5in] bg-white px-6 py-8 shadow-sm print:max-w-none print:px-0 print:py-0 print:shadow-none sm:px-8">
          <div className="border-b-[3px] border-green-700 pb-4 text-center">
            <p className="font-heading text-[11px] font-bold tracking-[0.32em] text-green-700">TANGUB CITY GLOBAL COLLEGE</p>
            <p className="mt-0.5 text-[9px] tracking-wide text-gray-500">Maloro, Tangub City, Misamis Occidental 7214</p>
            <p className="mt-3 font-heading text-sm font-bold tracking-tight text-gray-900">{instituteName}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Office of the OJT Coordinator</p>
          </div>

          <div className="mt-6 text-center">
            <h1 className="font-heading text-base font-bold tracking-tight text-gray-900 sm:text-[17px]">STUDENT PLACEMENT REPORT</h1>
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-green-600" />
            <p className="mt-3 inline-flex items-center rounded-full bg-gray-900 px-3.5 py-1 text-xs font-bold tracking-wide text-white">{ayLabel}</p>
          </div>

          <div className="mt-6 overflow-hidden rounded-sm border border-gray-800">
            <table className="w-full table-fixed border-collapse text-[7px] sm:text-[8px]">
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "21%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr className="bg-[#052e16] text-white">
                  <th className="border border-gray-700 px-2 py-2 text-center text-[7px] font-bold uppercase leading-tight tracking-wider sm:text-[8px]">Student Name</th>
                  <th className="border border-gray-700 px-2 py-2 text-center text-[7px] font-bold uppercase leading-tight tracking-wider sm:text-[8px]">Course / Program</th>
                  <th className="border border-gray-700 px-2 py-2 text-center text-[7px] font-bold uppercase leading-tight tracking-wider sm:text-[8px]">Company / Organization</th>
                  <th className="border border-gray-700 px-2 py-2 text-center text-[7px] font-bold uppercase leading-tight tracking-wider sm:text-[8px]">Department / Office Assigned</th>
                  <th className="border border-gray-700 px-2 py-2 text-center text-[7px] font-bold uppercase leading-tight tracking-wider sm:text-[8px]">Supervisor</th>
                  <th className="border border-gray-700 px-2 py-2 text-center text-[7px] font-bold uppercase leading-tight tracking-wider sm:text-[8px]">OJT Start &amp; End Dates</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className={`break-inside-avoid ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/70"}`}>
                    <td className="border border-gray-300 px-2 py-1.5 text-left font-semibold uppercase leading-tight text-gray-900">{r.student_name || "—"}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center font-medium text-gray-700">{r.program || "—"}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-left leading-tight text-gray-700">{r.company || <span className="text-gray-300">—</span>}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-left leading-tight text-gray-700">{r.department || <span className="text-gray-300">—</span>}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-left leading-tight text-gray-700">{r.supervisor || <span className="text-gray-300">—</span>}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center leading-tight text-gray-700">
                      {r.ojt_start || r.ojt_end ? (
                        <>
                          <span>{r.ojt_start || "—"}</span>
                          <span className="mx-1">–</span>
                          <span>{r.ojt_end || ""}</span>
                        </>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="border border-gray-300 px-2 py-10 text-center text-xs text-gray-400">
                      No students found for this academic year.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-[8px] text-gray-500">
            <span>
              {rows.length} student{rows.length === 1 ? "" : "s"} · {rows.filter((r) => r.company).length} placed · {rows.length - rows.filter((r) => r.company).length} unplaced
            </span>
            <span>Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>

          <div className="mt-10 flex justify-end break-inside-avoid sm:mt-14" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
            <div className="w-[38%] text-[9px] sm:w-[32%] sm:text-xs" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
              <p className="text-xs font-semibold text-gray-500">Prepared by:</p>
              <div className="mt-10 border-b border-gray-900 sm:mt-12" />
              <p className="mt-2 text-center font-heading text-[11px] font-bold uppercase tracking-wide text-gray-900">{coordinatorName || "________________________"}</p>
              <p className="text-center text-[9px] font-medium uppercase tracking-wider text-gray-500">{instituteName} OJT Coordinator</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
