import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { useAuth } from "@/contexts/AuthContext";

function SectionTitle({ children }) {
  return <h2 className="mb-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wider text-gray-700">{children}</h2>;
}

function miniStatsBox(label, value, tone = "text-gray-900") {
  return (
    <div className="rounded border border-gray-200 p-2 text-center">
      <p className="text-[9px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`font-heading text-base font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function CoordinatorHteInternsPrintPage() {
  const { user } = useAuth();
  const { hteUuid } = useParams();
  const [searchParams] = useSearchParams();
  const academicYearId = searchParams.get("academic_year_id") || "all";
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: "100", page: "1", sort: "id", order: "desc" });
      if (academicYearId !== "all") params.set("academic_year_id", academicYearId);
      const res = await api.get(`/coordinator/hte-evaluations/${hteUuid}/interns?${params.toString()}`);
      setData(res.data.data);
      setSummary(res.data.summary || null);
    } catch (err) {
      toast.error("Failed to load HTE interns", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
      if (window.parent !== window) {
        window.parent.postMessage({ type: "smartlog-hte-interns-print-ready" }, "*");
      }
    }
  }, [hteUuid, academicYearId]);

  useEffect(() => {
    load();
  }, [load]);

  const ayLabel = academicYearId === "all" ? "All Academic Years" : summary?.hte ? `${academicYearId}` : "—";
  const generatedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const preparedName = user?.full_name || [user?.firstname, user?.middlename, user?.lastname, user?.extension].filter(Boolean).join(" ") || "—";
  const hteName = summary?.hte?.name || "HTE";

  return (
    <div className="bg-gray-100">
      <style>{`@media print { @page { size: Letter landscape; margin: 8mm; } html, body { margin: 0 !important; padding: 0 !important; } .no-print { display: none !important; } body { background: white !important; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; } }`}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-700">
          Print / Save as PDF
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center bg-white py-24">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : !summary ? (
        <div className="mx-auto max-w-md bg-white px-6 py-24 text-center text-sm text-gray-600">Failed to load data.</div>
      ) : (
        <div className="mx-auto max-w-[11in] bg-white p-6 print:max-w-none print:p-0">
          <div className="mb-6 border-b border-gray-200 pb-4 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-green-700">Tangub City Global College</p>
            <h1 className="mt-1 font-heading text-lg font-bold text-gray-900">HTE Evaluation Summary</h1>
            <p className="text-[10px] text-gray-500">SMARTLOG OJT Monitoring System · {hteName}</p>
            <p className="mt-2 inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-[10px] font-semibold text-green-700 ring-1 ring-green-100">AY: {ayLabel}</p>
            <p className="mt-1 text-[9px] text-gray-400">Generated: {generatedAt}</p>
          </div>

          <div className="space-y-6">
            <div>
              <SectionTitle>Evaluation Summary</SectionTitle>
              <div className="grid grid-cols-4 gap-2">
                {miniStatsBox("Interns", summary.interns_count ?? 0)}
                {miniStatsBox("Evaluated", summary.evaluated_count ?? 0, "text-green-700")}
                {miniStatsBox("Personal Avg", summary.per_category?.personal_characteristics?.avg != null ? Number(summary.per_category.personal_characteristics.avg).toFixed(2) : "—")}
                {miniStatsBox("Weighted Avg", summary.weighted != null ? Number(summary.weighted).toFixed(2) : "—", "text-green-700")}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { key: "personal_characteristics", label: "Personal", weight: "30%" },
                  { key: "work_characteristics", label: "Work", weight: "30%" },
                  { key: "job_knowledge", label: "Job Knowledge", weight: "40%" },
                ].map(({ key, label, weight }) => {
                  const cat = summary.per_category?.[key];
                  return (
                    <div key={key} className="rounded border border-gray-200 p-2 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{label} · {weight}</p>
                      <p className="mt-1 font-heading text-base font-bold text-gray-900">{cat?.avg != null ? Number(cat.avg).toFixed(2) : "—"} <span className="text-xs font-normal text-gray-400">/ 5.00</span></p>
                      <p className="text-[9px] text-gray-500">{cat ? `${cat.answered} of ${cat.total} rated` : "0 of 0 rated"}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionTitle>Interns</SectionTitle>
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50">
                    <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-600">ID</th>
                    <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-600">Intern</th>
                    <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-600">Program</th>
                    <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-600">Status</th>
                    <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-600">Evaluation</th>
                    <th className="px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-gray-600">Weighted Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {(data || []).map((intern) => (
                    <tr key={intern.uuid || intern.id} className="border-b border-gray-100">
                      <td className="px-2 py-1.5 font-mono text-gray-700">#{intern.id}</td>
                      <td className="px-2 py-1.5">
                        <p className="font-semibold text-gray-800">{intern.full_name}</p>
                        <p className="text-[9px] text-gray-500">{intern.email}</p>
                      </td>
                      <td className="px-2 py-1.5 text-gray-700">{intern.program || "—"}</td>
                      <td className="px-2 py-1.5 text-gray-700">{intern.ojt_status || intern.status || "—"}</td>
                      <td className="px-2 py-1.5 text-gray-700">{intern.evaluation ? `${intern.evaluation.answered}/${intern.evaluation.total} ${intern.evaluation.status}` : "Not evaluated"}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold text-gray-900">{intern.evaluation?.weighted_average != null ? Number(intern.evaluation.weighted_average).toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                  {(!data || data.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-2 py-10 text-center text-xs text-gray-400">No interns found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-10 flex justify-end break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
              <div className="w-[42%] text-[9px] sm:w-[36%] sm:text-xs" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                <p className="text-gray-600">Prepared by:</p>
                <div className="mt-8 border-b border-gray-800 sm:mt-12" />
                <p className="mt-1.5 text-center font-heading text-[10px] font-bold uppercase tracking-wide text-gray-900 sm:text-xs">{preparedName}</p>
                <p className="text-center text-[9px] text-gray-500 sm:text-[10px]">OJT Coordinator</p>
              </div>
            </div>

            <p className="mt-6 border-t border-gray-200 pt-3 text-center text-[7px] uppercase tracking-widest text-gray-400">SMARTLOG OJT Monitoring System · Tangub City Global College · Confidential</p>
          </div>
        </div>
      )}
    </div>
  );
}
