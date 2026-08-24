import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { useAuth } from "@/contexts/AuthContext";
import { categorySections } from "@/pages/hte/evaluations/constants.js";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionTitle({ children }) {
  return <h2 className="mb-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wider text-gray-700">{children}</h2>;
}

export default function InstructorInternEvaluationPrintPage() {
  const { user } = useAuth();
  const { uuid } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/coordinator/intern-evaluations/${uuid}`);
      setData(res.data.data);
    } catch (err) {
      toast.error("Failed to load evaluation", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
      if (window.parent !== window) {
        window.parent.postMessage({ type: "smartlog-eval-print-ready" }, "*");
      }
    }
  }, [uuid]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const byCategory = new Map(categorySections.map((s) => [s.key, []]));
    (data?.criteria ?? []).forEach((c) => byCategory.get(c.category)?.push(c));
    return categorySections.map((s) => ({ ...s, items: byCategory.get(s.key) ?? [] })).filter((s) => s.items.length > 0);
  }, [data]);

  const totalCount = data?.criteria.length ?? 0;
  const answeredCount = (data?.criteria ?? []).filter((c) => c.response !== null).length;
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const categoryAverages = useMemo(() => {
    const map = {};
    for (const section of categorySections) {
      const items = grouped.find((g) => g.key === section.key)?.items ?? [];
      const answered = items.map((c) => c.response).filter((r) => r != null);
      const ratings = answered.map((r) => (r.is_na ? 0 : r.rating));
      const avg = answered.length ? ratings.reduce((a, b) => a + b, 0) / answered.length : null;
      map[section.key] = { avg, total: items.length };
    }
    return map;
  }, [grouped]);

  const weightedAverage = useMemo(() => {
    const p = categoryAverages.personal_characteristics?.avg;
    const w = categoryAverages.work_characteristics?.avg;
    const j = categoryAverages.job_knowledge?.avg;
    if (p == null && w == null && j == null) return null;
    return (p ?? 0) * 0.3 + (w ?? 0) * 0.3 + (j ?? 0) * 0.4;
  }, [categoryAverages]);

  const yearLabel = data?.intern?.academic_year || data?.academicYear || "—";
  const generatedAt = new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const preparedName = user?.full_name || [user?.firstname, user?.middlename, user?.lastname, user?.extension].filter(Boolean).join(" ") || "—";
  const instituteName = data?.intern?.institute || data?.hte?.institute || "—";

  return (
    <div className="bg-gray-100">
      <style>{`@media print { @page { size: Letter portrait; margin: 8mm; } html, body { margin: 0 !important; padding: 0 !important; } .no-print { display: none !important; } body { background: white !important; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; } }`}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-700">
          Print / Save as PDF
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center bg-white py-24">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : !data ? (
        <div className="mx-auto max-w-md bg-white px-6 py-24 text-center text-sm text-gray-600">Failed to load evaluation.</div>
      ) : (
        <div className="mx-auto max-w-[8.5in] bg-white p-6 print:max-w-none print:p-0">
          <div className="mb-6 border-b border-gray-200 pb-4 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-green-700">Tangub City Global College</p>
            <h1 className="mt-1 font-heading text-lg font-bold text-gray-900">Intern Evaluation Report</h1>
            <p className="text-[10px] text-gray-500">SMARTLOG OJT Monitoring System · {instituteName}</p>
            <p className="mt-2 inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-[10px] font-semibold text-green-700 ring-1 ring-green-100">AY: {yearLabel}</p>
            <p className="mt-1 text-[9px] text-gray-400">Generated: {generatedAt}</p>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 p-4">
              <h2 className="font-heading text-sm font-bold text-gray-900">{data.intern.full_name}</h2>
              <p className="text-xs text-gray-500">{data.intern.email} · {data.intern.program || "—"} · {data.intern.institute || "—"}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold capitalize text-gray-600 ring-1 ring-gray-200">{data.intern.status}</span>
                {data.intern.ojt_status && <span className="rounded-full bg-green-50 px-2 py-0.5 font-semibold capitalize text-green-700 ring-1 ring-green-100">{data.intern.ojt_status.replace(/-/g, " ")}</span>}
              </div>
            </div>

            {data.hte && (
              <div className="rounded-xl border border-green-100 bg-green-50/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">Host Training Establishment</p>
                <p className="font-heading text-sm font-bold text-green-950">{data.hte.name}</p>
                <p className="text-xs text-gray-600">{data.hte.institute || "—"} · {data.hte.program || "—"}</p>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700">{answeredCount} of {totalCount} answered</span>
                <span className="font-mono font-bold text-green-700">{progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-green-600" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div>
              <SectionTitle>Evaluation Summary</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                {categorySections.map((section) => {
                  const avg = categoryAverages[section.key]?.avg;
                  const weight = section.key === "job_knowledge" ? "40%" : "30%";
                  return (
                    <div key={section.key} className="rounded border border-gray-200 p-3 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{section.title} · {weight}</p>
                      <p className="mt-1 font-heading text-lg font-bold text-gray-900">{avg != null ? avg.toFixed(2) : "—"} <span className="text-xs font-normal text-gray-400">/ 5.00</span></p>
                    </div>
                  );
                })}
              </div>
              {weightedAverage != null && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-green-600 px-3 py-2 text-white">
                  <span className="text-[11px] font-semibold">Weighted Average (30% + 30% + 40%)</span>
                  <span className="font-heading text-sm font-bold">{weightedAverage.toFixed(2)} / 5.00</span>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {grouped.map((section) => (
                <div key={section.key} className="break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                  <h3 className="font-heading text-sm font-bold text-gray-900">{section.title}</h3>
                  <p className="text-xs text-gray-500">{section.description}</p>
                  <table className="mt-2 w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-gray-300 bg-gray-50">
                        <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-600">#</th>
                        <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-600">Indicator</th>
                        <th className="px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-gray-600">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((c, idx) => {
                        const r = c.response;
                        const label = r ? (r.is_na ? "N/A" : `${r.rating} – ${["","Excellent","Very Good","Good","Fair","Poor"][r.rating] || r.rating}`) : "—";
                        return (
                          <tr key={c.id} className="border-b border-gray-100">
                            <td className="px-2 py-1.5 text-center font-mono text-gray-500">{idx + 1}</td>
                            <td className="px-2 py-1.5 leading-snug text-gray-800">{c.indicator}</td>
                            <td className="px-2 py-1.5 text-center font-semibold text-gray-900">{label}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
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
