import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  School,
  UserRound,
  Users,
  MapPin,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

export default function InternDetailPage() {
  const { uuid } = useParams();
  const [intern, setIntern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/interns/${uuid}`)
      .then((res) => setIntern(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [uuid]);

  useEffect(() => {
    load();
  }, [load]);

  const location = intern?.location;

  return (
    <AdminLayout>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          className="h-11 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-green-700"
        >
          <Link to="/admin/interns">
            <ArrowLeft size={16} /> Back to interns
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{error}</p>
          <Button asChild variant="outline" className="mt-4 h-10 rounded-xl text-green-700">
            <Link to="/admin/interns">Back to interns</Link>
          </Button>
        </div>
      ) : intern ? (
        <>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-14 w-14 shrink-0">
                  {intern.profile_picture && <AvatarImage src={intern.profile_picture} alt={intern.full_name} />}
                  <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-base font-bold text-white">
                    {getInitials(intern.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="truncate font-heading text-xl font-bold text-green-950 sm:text-2xl">
                    {intern.full_name}
                  </h1>
                  <p className="truncate text-sm text-gray-500">{intern.email}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                    <span className="font-mono">#{intern.id}</span>
                    <span>Registered {formatDate(intern.created_at)}</span>
                    {intern.contact_number && <span>{intern.contact_number}</span>}
                  </p>
                </div>
              </div>
              <StatusChip status={intern.status} />
            </div>

            {intern.status === "rejected" && intern.rejection_reason && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">Rejection reason</p>
                  <p className="mt-0.5 text-sm text-red-800">{intern.rejection_reason}</p>
                </div>
              </div>
            )}

            {intern.status === "approved" && intern.reviewed_by && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-green-50 p-3 ring-1 ring-green-100">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-green-700" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                    Approved by {intern.reviewed_by}
                  </p>
                  <p className="mt-0.5 text-sm text-green-800">Reviewed on {formatDateTime(intern.reviewed_at)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <InfoCard icon={School} title="Placement">
              <InfoRow label="Institute" value={intern.institute} />
              <InfoRow label="Program" value={intern.program} />
              <InfoRow label="Academic Year" value={intern.academic_year} />
              <InfoRow label="Practicum Instructor" value={intern.practicum_instructor} />
              <InfoRow
                label="Certificate of Registration"
                value={
                  intern.cor ? (
                    <a
                      href={intern.cor}
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

            <InfoCard icon={UserRound} title="Personal Information">
              <InfoRow label="Date of Birth" value={formatDate(intern.date_of_birth)} />
              <InfoRow label="Place of Birth" value={intern.place_of_birth} />
            </InfoCard>

            <InfoCard icon={Users} title="Family & Guardian">
              <InfoRow label="Father's Name" value={intern.fathers_name} />
              <InfoRow label="Father's Occupation" value={intern.fathers_occupation} />
              <InfoRow label="Father's Contact" value={intern.fathers_contact} mono />
              <InfoRow label="Mother's Name" value={intern.mothers_name} />
              <InfoRow label="Mother's Occupation" value={intern.mothers_occupation} />
              <InfoRow label="Mother's Contact" value={intern.mothers_contact} mono />
              <InfoRow label="Guardian Address" value={intern.parents_guardian_address} />
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
