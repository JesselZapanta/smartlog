import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import HteLayout from "@/layouts/HteLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/PageLoader";
import InternDetailView from "@/components/InternDetailView.jsx";

export default function HteAssignedInternDetailPage() {
  const { uuid } = useParams();
  const [intern, setIntern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/hte/interns/${uuid}`)
      .then((res) => setIntern(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [uuid]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <HteLayout>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          className="h-11 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-green-700"
        >
          <Link to="/hte/interns">
            <ArrowLeft size={16} /> Back to assigned interns
          </Link>
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-xl text-green-700">
            <Link to="/hte/interns">Back to assigned interns</Link>
          </Button>
        </div>
      ) : intern ? (
        <InternDetailView intern={intern} />
      ) : (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      )}
    </HteLayout>
  );
}
