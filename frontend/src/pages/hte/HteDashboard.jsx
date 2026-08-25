import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Building2,
  BookOpen,
  Mail,
  Phone,
  CalendarCheck,
  FileCheck2,
  Users,
  Camera,
  ClipboardCheck,
  MessageSquare,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import HteLayout from "@/layouts/HteLayout.jsx";
import DashboardBanner from "@/components/DashboardBanner.jsx";
import SectionCard from "@/components/SectionCard.jsx";
import StatusChip from "@/components/StatusChip.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/dates";

const modules = [
  { icon: Users, title: "Monitor Interns", description: "View interns assigned to your establishment", tone: "bg-green-50 text-green-700", to: "/hte/interns" },
  { icon: Camera, title: "Verify DTR", description: "Confirm photo attendance entries", tone: "bg-emerald-50 text-emerald-700" },
  { icon: ClipboardCheck, title: "Intern Evaluation", description: "Evaluate intern performance", tone: "bg-teal-50 text-teal-700" },
  { icon: MessageSquare, title: "Feedback & Concerns", description: "Send concerns to the practicum instructor", tone: "bg-blue-50 text-blue-700" },
];

export default function HteDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [termsLoading, setTermsLoading] = useState(true);
  const [filters, setFilters] = useState({ academicYearId: "" });

  useEffect(() => {
    api
      .get("/academic-terms/options")
      .then((res) => {
        const list = res.data.data || [];
        setAcademicYears(list);
        const active = list.find((term) => term.status === "active");
        if (active) setFilters((prev) => ({ ...prev, academicYearId: String(active.id) }));
      })
      .catch(() => {})
      .finally(() => setTermsLoading(false));
  }, []);

  const load = useCallback(() => {
    if (termsLoading) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (filters.academicYearId) params.set("academic_year_id", filters.academicYearId);
    const qs = params.toString();
    api
      .get(`/dashboard${qs ? `?${qs}` : ""}`)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(firstErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [filters, termsLoading]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <HteLayout>
      <DashboardBanner
        roleLabel="HTE"
        subtitle="Manage your partnership with the college, verify intern attendance, and submit evaluations."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={filters.academicYearId}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, academicYearId: value }))}
          disabled={termsLoading}
        >
          <SelectTrigger className="h-11 w-full rounded-xl bg-white sm:w-[240px]">
            <SelectValue placeholder={termsLoading ? "Loading years..." : "Academic Year"} />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((term) => (
              <SelectItem key={term.id} value={String(term.id)}>
                {term.description || term.code}
                {term.status === "active" ? " · Active" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-600">{error}</p>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            <SectionCard title="Organization Profile" subtitle="Your host training establishment record">
              {data.hte ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                        <Building2 size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{data.hte.name}</p>
                        <p className="truncate text-xs text-gray-400">{data.hte.institute || "—"}</p>
                      </div>
                    </div>
                    <StatusChip status={data.hte.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: BookOpen, label: "Program", value: data.hte.program || "—" },
                      { icon: FileCheck2, label: "MOA", value: data.hte.has_moa ? "On file" : "Not uploaded" },
                      { icon: CalendarCheck, label: "Start Date", value: data.hte.start_at ? formatDate(data.hte.start_at) : "—" },
                      { icon: CalendarCheck, label: "End Date", value: data.hte.end_at ? formatDate(data.hte.end_at) : "—" },
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
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Building2 size={28} className="text-gray-300" />
                  <p className="text-sm text-gray-500">
                    Your organization record hasn't been set up yet. The OJT coordinator will complete it.
                  </p>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Account" subtitle="Your login details">
              <div className="space-y-3">
                {[
                  { icon: Mail, label: "Email", value: data.user.email || "—" },
                  { icon: Phone, label: "Contact Number", value: data.user.contact_number || "—" },
                  { icon: CalendarCheck, label: "Member Since", value: formatDate(data.user.created_at) },
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
          </section>

          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-4">
            {modules.map(({ icon: Icon, title, description, tone, to }) => {
              const inner = (
                <div className="flex items-start gap-3 p-4 sm:p-5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${tone} ring-current/10`}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-heading text-base font-bold text-gray-900">{title}</h3>
                      {to ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-600">
                          Open
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{description}</p>
                  </div>
                </div>
              );
              return (
                <Card key={title} className="rounded-2xl border-gray-200 shadow-sm">
                  {to ? <Link to={to}>{inner}</Link> : inner}
                </Card>
              );
            })}
          </section>
        </>
      )}
    </HteLayout>
  );
}
