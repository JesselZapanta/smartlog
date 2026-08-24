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
      <style>{`@media print { @page { size: Legal landscape; margin: 10mm 8mm 10mm 8mm; } html, body { margin: 0 !important; padding: 0 !important; background: white !important; } .no-print { display: none !important; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; } }`}</style>

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
        <div className="mx-auto max-w-[13.5in] bg-white px-6 py-6 shadow-sm print:max-w-none print:px-0 print:py-0 print:shadow-none sm:px-8">
          <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-3">
            <img src="/images/tcgc-logo.png" alt="TCGC" className="h-14 w-14 shrink-0 object-contain sm:h-[68px] sm:w-[68px]" />
            <div className="min-w-0 flex-1 text-center">
              <p className="font-heading text-[10px] font-bold uppercase tracking-widest text-gray-500 sm:text-xs">Tangub City Global College</p>
              <p className="text-[9px] text-gray-400 sm:text-[10px]">Maloro, Tangub City</p>
              <p className="mt-0.5 font-heading text-xs font-bold text-gray-800 sm:text-sm">{instituteName}</p>
            </div>
            <img src="/images/ics-logo.jpg" alt="ICS" className="h-14 w-14 shrink-0 rounded-full object-contain sm:h-[68px] sm:w-[68px]" />
          </div>

          <div className="mt-5 text-center">
            <h1 className="font-heading text-base font-bold tracking-tight text-gray-900 sm:text-lg">Student Placement Report</h1>
            <p className="mt-1 text-xs font-semibold text-gray-600 sm:text-sm">{ayLabel}</p>
          </div>

          <div className="mt-5 overflow-hidden border border-gray-300">
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
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-1.5 py-2 text-center text-[7px] font-bold uppercase leading-tight tracking-wider text-gray-700 sm:px-2 sm:text-[8px]">Student Name</th>
                  <th className="border border-gray-300 px-1.5 py-2 text-center text-[7px] font-bold uppercase leading-tight tracking-wider text-gray-700 sm:px-2 sm:text-[8px]">Course / Program</th>
                  <th className="border border-gray-300 px-1.5 py-2 text-center text-[7px] font-bold uppercase leading-tight tracking-wider text-gray-700 sm:px-2 sm:text-[8px]">Company / Organization</th>
                  <th className="border border-gray-300 px-1.5 py-2 text-center text-[7px] font-bold uppercase leading-tight tracking-wider text-gray-700 sm:px-2 sm:text-[8px]">Department / Office Assigned</th>
                  <th className="border border-gray-300 px-1.5 py-2 text-center text-[7px] font-bold uppercase leading-tight tracking-wider text-gray-700 sm:px-2 sm:text-[8px]">Supervisor</th>
                  <th className="border border-gray-300 px-1.5 py-2 text-center text-[7px] font-bold uppercase leading-tight tracking-wider text-gray-700 sm:px-2 sm:text-[8px]">OJT Start &amp; End Dates</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="break-inside-avoid">
                    <td className="border border-gray-300 px-1.5 py-1 text-left font-medium uppercase leading-tight text-gray-800 sm:px-2 sm:py-1.5">{r.student_name || "—"}</td>
                    <td className="border border-gray-300 px-1.5 py-1 text-center text-gray-700 sm:px-2 sm:py-1.5">{r.program || "—"}</td>
                    <td className="border border-gray-300 px-1.5 py-1 text-left leading-tight text-gray-700 sm:px-2 sm:py-1.5">{r.company || ""}</td>
                    <td className="border border-gray-300 px-1.5 py-1 text-left leading-tight text-gray-700 sm:px-2 sm:py-1.5">{r.department || ""}</td>
                    <td className="border border-gray-300 px-1.5 py-1 text-left leading-tight text-gray-700 sm:px-2 sm:py-1.5">{r.supervisor || ""}</td>
                    <td className="border border-gray-300 px-1.5 py-1 text-center leading-tight text-gray-700 sm:px-2 sm:py-1.5">
                      {r.ojt_start || r.ojt_end ? (
                        <>
                          <span>{r.ojt_start || "—"}</span>
                          <span className="mx-1">–</span>
                          <span>{r.ojt_end || ""}</span>
                        </>
                      ) : (
                        "—"
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

          <div className="mt-10 flex justify-end break-inside-avoid break-before-auto sm:mt-14" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
            <div className="w-[42%] text-[9px] sm:w-[36%] sm:text-xs" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
              <p className="text-gray-600">Prepared by:</p>
              <div className="mt-8 border-b border-gray-800 sm:mt-12" />
              <p className="mt-1.5 text-center font-heading text-[10px] font-bold uppercase tracking-wide text-gray-900 sm:text-xs">{coordinatorName}</p>
              <p className="text-center text-[9px] text-gray-500 sm:text-[10px]">{instituteName} OJT Coordinator</p>
            </div>
          </div>

          <p className="mt-8 text-center text-[7px] uppercase tracking-widest text-gray-400 sm:text-[8px]">SMARTLOG OJT Monitoring System · Tangub City Global College · Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      )}
    </div>
  );
}
