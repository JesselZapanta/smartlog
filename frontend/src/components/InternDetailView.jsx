import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Briefcase,
  Building2,
  Cake,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  FileText,
  GraduationCap,
  Hash,
  Home,
  Mail,
  Map,
  MapPin,
  Phone,
  Presentation,
  School,
  ShieldCheck,
  User,
  UserRound,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-400 shadow-sm ring-1 ring-gray-100">
        <Icon size={15} />
      </div>
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

export default function InternDetailView({ intern }) {
  const location = intern?.location;
  const [tab, setTab] = useState("overview");

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 via-green-700 to-emerald-500 p-4 shadow-lg sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Avatar className="h-14 w-14 shrink-0 border-2 border-white/40 shadow-md sm:h-20 sm:w-20">
              {intern.profile_picture && <AvatarImage src={intern.profile_picture} alt={intern.full_name} />}
              <AvatarFallback className="bg-gradient-to-br from-white/25 to-white/10 text-base font-bold text-white sm:text-lg">
                {getInitials(intern.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="break-words font-heading text-xl font-bold leading-tight text-white sm:truncate sm:text-3xl">{intern.full_name}</h1>
              <p className="mt-1 flex flex-col gap-1 text-xs text-green-100 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1 sm:text-sm">
                <span className="inline-flex min-w-0 items-center gap-1.5 break-all">
                  <Mail size={13} className="shrink-0" /> <span className="min-w-0 break-all">{intern.email}</span>
                </span>
                {intern.contact_number && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={13} className="shrink-0" /> {intern.contact_number}
                  </span>
                )}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <HeroChip icon={Hash}>{intern.id}</HeroChip>
                {intern.program && <HeroChip icon={School}>{intern.program}</HeroChip>}
                {intern.institute && <HeroChip icon={Building2}>{intern.institute}</HeroChip>}
              </div>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col items-start gap-2 sm:w-auto sm:items-end">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusChip status={intern.status} />
              {intern.ojt_status && intern.ojt_status !== "pending" && <StatusChip status={intern.ojt_status} />}
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-100">
              <CalendarDays size={12} className="shrink-0" /> Registered {formatDate(intern.created_at)}
            </span>
          </div>
        </div>
      </div>

      {intern.status === "rejected" && intern.rejection_reason && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-red-50 p-3.5 ring-1 ring-red-100">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">Rejection reason</p>
            <p className="mt-0.5 text-sm text-red-800">{intern.rejection_reason}</p>
          </div>
        </div>
      )}

      {intern.status === "approved" && intern.reviewed_by && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-green-50 p-3.5 ring-1 ring-green-100">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-green-700" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">Approved by {intern.reviewed_by}</p>
            <p className="mt-0.5 text-sm text-green-800">Reviewed on {formatDateTime(intern.reviewed_at)}</p>
          </div>
        </div>
      )}

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
            value="personal"
            className="min-h-11 shrink-0 gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-semibold sm:gap-1.5 sm:px-3 sm:text-sm data-active:bg-green-600! data-active:text-white! data-active:shadow-sm"
          >
            <UserRound size={16} className="shrink-0" /> Personal
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
            <div className="overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50/40 shadow-sm ring-1 ring-green-100">
              <div className="flex flex-col gap-3 border-b border-green-100/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
                    <Building2 size={17} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-700/70">
                      Host Training Establishment
                    </p>
                    <p className="font-heading text-lg font-bold text-green-950">
                      {intern.hte?.name || "Not assigned"}
                    </p>
                  </div>
                </div>
                {intern.hte?.status && <StatusChip status={intern.hte.status} />}
              </div>
              <div className="grid grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
                <InfoRow icon={Building2} label="Institute" value={intern.hte?.institute} />
                <InfoRow icon={GraduationCap} label="Program" value={intern.hte?.program} />
                <InfoRow icon={CalendarDays} label="Partnership Start" value={formatDate(intern.hte?.start_at)} />
                <InfoRow icon={CalendarClock} label="Partnership End" value={formatDate(intern.hte?.end_at)} />
              </div>
            </div>

            {intern.ojt_status && (
              <InfoCard icon={Activity} title="OJT Status" tone="bg-emerald-50 text-emerald-700">
                <InfoRow
                  icon={Activity}
                  label="Status"
                  value={intern.ojt_status ? <StatusChip status={intern.ojt_status} /> : null}
                />
                <InfoRow icon={CalendarDays} label="Start Date" value={formatDate(intern.start_date)} />
                <InfoRow icon={CalendarClock} label="End Date" value={formatDate(intern.end_date)} />
              </InfoCard>
            )}
          </div>
        </TabsContent>

        <TabsContent value="placement" className="mt-0">
          <div className="mt-4 sm:mt-5">
            <InfoCard icon={School} title="Placement">
              <InfoRow icon={Building2} label="Institute" value={intern.institute} />
              <InfoRow icon={GraduationCap} label="Program" value={intern.program} />
              <InfoRow icon={CalendarRange} label="Academic Year" value={intern.academic_year} />
              <InfoRow icon={Presentation} label="Practicum Instructor" value={intern.practicum_instructor} />
              <InfoRow
                icon={FileText}
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
          </div>
        </TabsContent>

        <TabsContent value="personal" className="mt-0">
          <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 lg:grid-cols-2 lg:gap-5">
            <InfoCard icon={UserRound} title="Personal Information">
              <InfoRow icon={Cake} label="Date of Birth" value={formatDate(intern.date_of_birth)} />
              <InfoRow icon={MapPin} label="Place of Birth" value={intern.place_of_birth} />
            </InfoCard>

            <InfoCard icon={Users} title="Family & Guardian">
              <InfoRow icon={User} label="Father's Name" value={intern.fathers_name} />
              <InfoRow icon={Briefcase} label="Father's Occupation" value={intern.fathers_occupation} />
              <InfoRow icon={Phone} label="Father's Contact" value={intern.fathers_contact} mono />
              <InfoRow icon={User} label="Mother's Name" value={intern.mothers_name} />
              <InfoRow icon={Briefcase} label="Mother's Occupation" value={intern.mothers_occupation} />
              <InfoRow icon={Phone} label="Mother's Contact" value={intern.mothers_contact} mono />
              <InfoRow icon={Home} label="Guardian Address" value={intern.parents_guardian_address} />
            </InfoCard>
          </div>
        </TabsContent>

        <TabsContent value="address" className="mt-0">
          <div className="mt-4 sm:mt-5">
            <InfoCard icon={MapPin} title="Address" tone="bg-blue-50 text-blue-600">
              <InfoRow icon={Map} label="Region" value={location?.region} />
              <InfoRow icon={MapPin} label="Province" value={location?.province} />
              <InfoRow icon={Building2} label="City / Municipality" value={location?.city_municipality} />
              <InfoRow icon={Home} label="Barangay" value={location?.barangay} />
            </InfoCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
