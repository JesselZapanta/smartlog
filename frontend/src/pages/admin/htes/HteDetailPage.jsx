import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  FileText,
  GraduationCap,
  Hash,
  Loader2,
  Mail,
  MapPin,
  Phone,
  School,
  UserRound,
  Home,
} from "lucide-react";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/PageLoader";
import StatusChip from "@/components/StatusChip.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

function HeroChip({ icon: Icon, children }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/30 backdrop-blur">
      {Icon && <Icon size={11} className="shrink-0 text-green-100" />}
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}

function InfoRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-50 bg-gray-50/60 px-3 py-2.5">
      {Icon ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-400 shadow-sm ring-1 ring-gray-100">
          <Icon size={15} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</dt>
        <dd className={`mt-0.5 break-words text-sm font-semibold text-gray-800 ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children, tone = "bg-green-50 text-green-700" }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-2 border-b border-gray-50 px-4 py-3 sm:px-5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-current/10 ${tone}`}>
          <Icon size={16} />
        </div>
        <h2 className="font-heading text-sm font-bold text-green-950">{title}</h2>
      </div>
      <div className="space-y-2.5 p-4 sm:p-5">{children}</div>
    </div>
  );
}

export default function HteDetailPage() {
  const { uuid } = useParams();
  const [hte, setHte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

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
      <div className="flex items-center gap-2 px-1 sm:px-0">
        <Button
          asChild
          variant="ghost"
          className="h-11 rounded-xl px-3 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-green-700 sm:px-4"
        >
          <Link to="/admin/htes" className="inline-flex items-center gap-2">
            <ArrowLeft size={16} /> <span>Back to HTEs</span>
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
        <div className="space-y-4 sm:space-y-5">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 via-green-700 to-emerald-500 p-4 shadow-lg sm:p-7">
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/5" />

            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <Avatar className="h-14 w-14 shrink-0 border-2 border-white/40 shadow-md sm:h-20 sm:w-20">
                  {hte.profile_picture && <AvatarImage src={hte.profile_picture} alt={hte.contact_person} className="object-cover" />}
                  <AvatarFallback className="bg-gradient-to-br from-white/25 to-white/10 text-base font-bold text-white sm:text-lg">
                    {getInitials(hte.contact_person || hte.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="break-words font-heading text-xl font-bold leading-tight text-white sm:truncate sm:text-3xl">{hte.name}</h1>
                  <p className="mt-1 break-words text-sm font-medium text-green-50 sm:truncate">{hte.contact_person}</p>
                  <p className="mt-1 flex flex-col gap-1 text-xs text-green-100 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1 sm:text-sm">
                    <span className="inline-flex min-w-0 items-center gap-1.5 break-all">
                      <Mail size={13} className="shrink-0" /> <span className="min-w-0 break-all">{hte.email}</span>
                    </span>
                    {hte.contact_number && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone size={13} className="shrink-0" /> {hte.contact_number}
                      </span>
                    )}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <HeroChip icon={Hash}>{hte.id}</HeroChip>
                    {hte.program && <HeroChip icon={GraduationCap}>{hte.program}</HeroChip>}
                    {hte.institute && <HeroChip icon={Building2}>{hte.institute}</HeroChip>}
                  </div>
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col items-start gap-2 sm:w-auto sm:items-end">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusChip status={hte.status} />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-100">
                  <CalendarDays size={12} className="shrink-0" /> Registered {formatDate(hte.created_at)}
                </span>
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex h-auto! w-full justify-start gap-1.5 overflow-x-auto bg-gray-100/80 p-1 [scrollbar-width:none] sm:h-11! sm:gap-1 [&::-webkit-scrollbar]:hidden">
              <TabsTrigger
                value="overview"
                className="min-h-11 shrink-0 gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-semibold sm:gap-1.5 sm:px-3 sm:text-sm data-active:bg-green-600! data-active:text-white! data-active:shadow-sm"
              >
                <Building2 size={16} className="shrink-0" /> Overview
              </TabsTrigger>
              <TabsTrigger
                value="placement"
                className="min-h-11 shrink-0 gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-semibold sm:gap-1.5 sm:px-3 sm:text-sm data-active:bg-green-600! data-active:text-white! data-active:shadow-sm"
              >
                <School size={16} className="shrink-0" /> Placement
              </TabsTrigger>
              <TabsTrigger
                value="account"
                className="min-h-11 shrink-0 gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-semibold sm:gap-1.5 sm:px-3 sm:text-sm data-active:bg-green-600! data-active:text-white! data-active:shadow-sm"
              >
                <UserRound size={16} className="shrink-0" /> Account
              </TabsTrigger>
              <TabsTrigger
                value="address"
                className="min-h-11 shrink-0 gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-semibold sm:gap-1.5 sm:px-3 sm:text-sm data-active:bg-green-600! data-active:text-white! data-active:shadow-sm"
              >
                <MapPin size={16} className="shrink-0" /> Address
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
                <InfoCard icon={Building2} title="HTE Details">
                  <InfoRow icon={Building2} label="HTE Name" value={hte.name} />
                  <InfoRow icon={UserRound} label="Contact Person" value={hte.contact_person} />
                  <InfoRow icon={Mail} label="Email" value={hte.email} />
                  <InfoRow icon={Phone} label="Contact Number" value={hte.contact_number} mono />
                  <InfoRow
                    icon={FileText}
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
              </div>
            </TabsContent>

            <TabsContent value="placement" className="mt-0">
              <div className="mt-4 sm:mt-5">
                <InfoCard icon={School} title="Placement">
                  <InfoRow icon={Building2} label="Institute" value={hte.institute} />
                  <InfoRow icon={GraduationCap} label="Program" value={hte.program} />
                  <InfoRow icon={CalendarDays} label="Start Date" value={formatDate(hte.start_at)} />
                  <InfoRow icon={CalendarDays} label="End Date" value={formatDate(hte.end_at)} />
                </InfoCard>
              </div>
            </TabsContent>

            <TabsContent value="account" className="mt-0">
              <div className="mt-4 sm:mt-5">
                <InfoCard icon={UserRound} title="Account">
                  <InfoRow icon={UserRound} label="Full Name" value={hte.contact_person} />
                  <InfoRow icon={Mail} label="Email" value={hte.email} />
                  <InfoRow icon={Phone} label="Contact Number" value={hte.contact_number} mono />
                </InfoCard>
              </div>
            </TabsContent>

            <TabsContent value="address" className="mt-0">
              <div className="mt-4 sm:mt-5">
                <InfoCard icon={MapPin} title="Address" tone="bg-blue-50 text-blue-600">
                  <InfoRow icon={MapPin} label="Region" value={location?.region} />
                  <InfoRow icon={MapPin} label="Province" value={location?.province} />
                  <InfoRow icon={Building2} label="City / Municipality" value={location?.city_municipality} />
                  <InfoRow icon={Home} label="Barangay" value={location?.barangay} />
                </InfoCard>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      )}
    </AdminLayout>
  );
}
