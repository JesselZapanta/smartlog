import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import InstructorLayout from "@/layouts/InstructorLayout.jsx";
import InternEvaluationDetailView from "@/components/InternEvaluationDetailView.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/PageLoader";

export default function InstructorInternEvaluationDetailPage() {
  const { uuid } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const iframeRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/instructor/intern-evaluations/${uuid}`);
      setData(res.data.data);
    } catch (err) {
      setError(firstErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrint = () => {
    if (isPrinting) return;
    setIsPrinting(true);
    const printUrl = `/instructor/intern-evaluations/${uuid}/print`;
    const ensureIframe = () => {
      if (iframeRef.current) return iframeRef.current;
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.inset = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.zIndex = "9999";
      iframeRef.current = iframe;
      document.body.appendChild(iframe);
      return iframe;
    };
    const iframe = ensureIframe();
    iframe.src = printUrl;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setIsPrinting(false);
    };
    const handler = (e) => {
      if (e.data?.type === "smartlog-eval-print-ready") {
        setTimeout(() => {
          try {
            iframeRef.current?.contentWindow?.print();
          } catch {}
          finish();
        }, 250);
        window.removeEventListener("message", handler);
        clearTimeout(fallback);
      }
    };
    window.addEventListener("message", handler);
    const fallback = setTimeout(finish, 8000);
    iframe.addEventListener("load", () => setTimeout(finish, 3000), { once: true });
  };

  return (
    <InstructorLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          asChild
          variant="ghost"
          className="h-11 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-green-700"
        >
          <Link to="/instructor/intern-evaluations">
            <ArrowLeft size={16} /> Back to intern evaluations
          </Link>
        </Button>
        {data && !loading && !error && (
          <Button
            onClick={handlePrint}
            disabled={isPrinting}
            className="h-11 whitespace-nowrap rounded-xl bg-green-600 px-5 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {isPrinting ? "Preparing..." : "Print Report"}
          </Button>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-xl text-green-700">
            <Link to="/instructor/intern-evaluations">Back to intern evaluations</Link>
          </Button>
        </div>
      ) : data ? (
        <InternEvaluationDetailView data={data} />
      ) : null}
    </InstructorLayout>
  );
}
