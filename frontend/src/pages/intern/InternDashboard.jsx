import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Building2,
  BookOpen,
  CalendarDays,
  UserRound,
  Mail,
  Phone,
  CalendarCheck,
  Camera,
  NotebookPen,
  FolderUp,
  ClipboardCheck,
  ShieldCheck,
  Clock3,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import InternLayout from "@/layouts/InternLayout.jsx";
import DashboardBanner from "@/components/DashboardBanner.jsx";
import SectionCard from "@/components/SectionCard.jsx";
import StatusChip from "@/components/StatusChip.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/dates";

const modules = [
  { icon: Camera, title: "Photo DTR", description: "Time in and out with photo capture", tone: "bg-green-50 text-green-700" },
  { icon: NotebookPen, title: "Daily Journal", description: "Document your daily tasks and learnings", tone: "bg-emerald-50 text-emerald-700" },
  { icon: FolderUp, title: "Requirements", description: "Submit pre and post-deployment documents", tone: "bg-teal-50 text-teal-700" },
  { icon: ClipboardCheck, title: "HTE Evaluation", description: "Evaluate your host training establishment", tone: "bg-blue-50 text-blue-700" },
];

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function InternDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard")
      .then((res) => setData(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <InternLayout>
      <DashboardBanner
        roleLabel="INTERN"
        subtitle="Track your hours, submit your journal, and stay on top of your OJT requirements."
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-600">{error}</p>
      ) : (
        <>
          {data.intern?.status === "pending" && (
            <section className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 sm:items-center sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Clock3 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-base font-bold text-amber-900">Registration under review</h2>
                <p className="mt-0.5 text-sm text-amber-700">
                  Your OJT coordinator is reviewing your registration. You'll be able to use SMARTLOG once it's
                  approved — check back soon.
                </p>
              </div>
            </section>
          )}

          {data.intern?.status === "rejected" && (
            <section className="rounded-3xl border border-red-200 bg-red-50 p-4 sm:p-5">
              <div className="flex items-start gap-3 sm:items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <XCircle size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-base font-bold text-red-900">Registration rejected</h2>
                  <p className="mt-0.5 text-sm text-red-700">
                    Your registration was not approved. Review the reason below, fix your details, and resubmit.
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-red-100">
                <p className="text-xs font-bold uppercase tracking-wide text-red-500">Reason for rejection</p>
                <p className="mt-1 text-sm text-gray-800">{data.intern.rejection_reason || "No reason provided."}</p>
              </div>
              <Button asChild className="mt-4 h-11 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700">
                <Link to="/intern/resubmit">
                  Resubmit Registration <ArrowRight size={16} />
                </Link>
              </Button>
            </section>
          )}

          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <Card className="rounded-2xl border-gray-200 shadow-sm">
              <div className="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left">
                <Avatar className="h-16 w-16 border-2 border-green-500">
                  {data.user.profile_picture && <AvatarImage src={data.user.profile_picture} alt={data.user.full_name} />}
                  <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-lg font-bold text-white">
                    {getInitials(data.user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-bold text-gray-900">{data.user.full_name}</h2>
                  <p className="truncate text-sm text-gray-500">{data.user.email}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <StatusChip status={data.user.email_verified_at ? "verified" : "pending"} />
                    {data.intern && <StatusChip status={data.intern.status} />}
                    <span className="rounded-full bg-gray-100 px-3 py-1 font-mono text-xs font-semibold text-gray-600">
                      Member since {formatDate(data.user.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="lg:col-span-2">
              <SectionCard title="Internship Details" subtitle="Your assigned institute, program and academic year">
                {data.intern ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                    {[
                      { icon: Building2, label: "Institute", value: data.intern.institute || "—" },
                      { icon: BookOpen, label: "Program", value: data.intern.program || "—" },
                      { icon: CalendarDays, label: "Academic Year", value: data.intern.academic_year || "—" },
                      { icon: UserRound, label: "Practicum Instructor", value: data.intern.practicum_instructor || "—" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                          <item.icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{item.label}</p>
                          <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Building2 size={28} className="text-gray-300" />
                    <p className="text-sm text-gray-500">
                      Your internship details haven't been set up yet. Your OJT coordinator will complete them.
                    </p>
                  </div>
                )}
              </SectionCard>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            {modules.map(({ icon: Icon, title, description, tone }) => (
              <Card key={title} className="rounded-2xl border-gray-200 shadow-sm">
                <div className="flex items-start gap-3 p-4 sm:p-5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${tone} ring-current/10`}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-heading text-base font-bold text-gray-900">{title}</h3>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                        Soon
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </section>

          <SectionCard title="Account" subtitle="Your contact information" action={<ShieldCheck size={18} className="text-gray-300" />}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: Mail, label: "Email", value: data.user.email || "—" },
                { icon: Phone, label: "Contact Number", value: data.user.contact_number || "—" },
                { icon: CalendarCheck, label: "Registered", value: formatDate(data.user.created_at) },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                  <item.icon size={18} className="shrink-0 text-green-700" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{item.label}</p>
                    <p className="truncate text-sm font-semibold text-gray-800">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </InternLayout>
  );
}
