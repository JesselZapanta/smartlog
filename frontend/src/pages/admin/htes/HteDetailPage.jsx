import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  UserRound,
  School,
  MapPin,
  FileText,
  Loader2,
} from "lucide-react";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/PageLoader";
import StatusChip from "@/components/StatusChip.jsx";

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className={`min-w-0 text-sm text-gray-800 ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50 text-green-700">
          <Icon size={16} />
        </div>
        <h2 className="font-heading text-sm font-bold text-green-950">{title}</h2>
      </div>
      <dl className="space-y-3">{children}</dl>
    </div>
  );
}

export default function HteDetailPage() {
  const { uuid } = useParams();
  const [hte, setHte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/htes/${uuid}`)
      .then((res) => setHte(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [uuid]);

  useEffect(() => {
    load();
  }, [load]);

  const location = hte?.location;

  return (
    <AdminLayout>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          className="h-11 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-green-700"
        >
          <Link to="/admin/htes">
            <ArrowLeft size={16} /> Back to HTEs
          </Link>
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-xl text-green-700">
            <Link to="/admin/htes">Back to HTEs</Link>
          </Button>
        </div>
      ) : hte ? (
        <>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-14 w-14 shrink-0">
                  {hte.profile_picture && <AvatarImage src={hte.profile_picture} alt={hte.contact_person} />}
                  <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-base font-bold text-white">
                    {getInitials(hte.contact_person)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="truncate font-heading text-xl font-bold text-green-950 sm:text-2xl">{hte.name}</h1>
                  <p className="truncate text-sm text-gray-500">{hte.contact_person}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                    <span className="font-mono">#{hte.id}</span>
                    <span>Registered {formatDate(hte.created_at)}</span>
                    {hte.contact_number && <span>{hte.contact_number}</span>}
                  </p>
                </div>
              </div>
              <StatusChip status={hte.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <InfoCard icon={Building2} title="HTE Details">
              <InfoRow label="HTE Name" value={hte.name} />
              <InfoRow label="Contact Person" value={hte.contact_person} />
              <InfoRow label="Email" value={hte.email} />
              <InfoRow label="Contact Number" value={hte.contact_number} mono />
              <InfoRow
                label="Memorandum of Agreement"
                value={
                  hte.moa_url ? (
                    <a
                      href={hte.moa_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-green-700 hover:underline"
                    >
                      <FileText size={14} /> Open PDF
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </InfoCard>

            <InfoCard icon={School} title="Placement">
              <InfoRow label="Institute" value={hte.institute} />
              <InfoRow label="Program" value={hte.program} />
              <InfoRow label="Start Date" value={formatDate(hte.start_at)} />
              <InfoRow label="End Date" value={formatDate(hte.end_at)} />
            </InfoCard>

            <InfoCard icon={UserRound} title="Account">
              <InfoRow label="Full Name" value={hte.contact_person} />
              <InfoRow label="Email" value={hte.email} />
              <InfoRow label="Contact Number" value={hte.contact_number} mono />
            </InfoCard>

            <InfoCard icon={MapPin} title="Address">
              <InfoRow label="Region" value={location?.region} />
              <InfoRow label="Province" value={location?.province} />
              <InfoRow label="City / Municipality" value={location?.city_municipality} />
              <InfoRow label="Barangay" value={location?.barangay} />
            </InfoCard>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      )}
    </AdminLayout>
  );
}
