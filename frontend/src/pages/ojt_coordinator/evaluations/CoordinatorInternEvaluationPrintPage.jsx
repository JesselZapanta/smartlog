import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { useAuth } from "@/contexts/AuthContext";
import InternEvaluationPrintView from "@/components/InternEvaluationPrintView.jsx";

export default function CoordinatorInternEvaluationPrintPage() {
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

  const preparedName =
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
        <div className="flex items-center justify-center bg-white py-24">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : !data ? (
        <div className="mx-auto max-w-md bg-white px-6 py-24 text-center text-sm text-gray-600">Failed to load evaluation.</div>
      ) : (
        <InternEvaluationPrintView data={data} preparedName={preparedName} roleLabel="OJT Coordinator" />
      )}
    </div>
  );
}
