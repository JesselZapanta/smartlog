import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Printer,
  Loader2,
  Users,
  GraduationCap,
  Building2,
  CalendarCheck,
  FileText,
  AlertTriangle,
  Star,
  BookOpen,
  School,
  Clock,
  BadgeCheck,
  Layers,
  FileCheck,
  ClipboardList,
  ChevronRight,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import PageHeader from "@/components/PageHeader.jsx";
import StatCard from "@/components/StatCard.jsx";
import SectionCard from "@/components/SectionCard.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";

const REPORTS = [
  {
    key: "overview",
    label: "Executive Overview",
    desc: "System-wide KPIs and distribution",
    icon: BarChart3,
    tone: "green",
    statKey: "interns.total",
  },
  {
    key: "interns",
    label: "Intern Deployment",
    desc: "Registration, status & placement",
    icon: GraduationCap,
    tone: "emerald",
    statKey: "interns.total",
  },
  {
    key: "htes",
    label: "HTE Partners",
    desc: "Host training establishments",
    icon: Building2,
    tone: "blue",
    statKey: "htes.total",
  },
  {
    key: "academic",
    label: "Academic Setup",
    desc: "Institutes, programs, AY & hours",
    icon: School,
    tone: "amber",
    statKey: "institutes.total",
  },
  {
    key: "requirements",
    label: "Requirements",
    desc: "Compliance & submissions",
    icon: FileCheck,
    tone: "violet",
    statKey: "requirements.total",
  },
  {
    key: "dtr",
    label: "Attendance & DTR",
    desc: "Photo DTR, journals & hours",
    icon: CalendarCheck,
    tone: "teal",
    statKey: "dtr.total",
  },
  {
    key: "users",
    label: "User Accounts",
    desc: "Accounts by role & verification",
    icon: ShieldCheck,
    tone: "slate",
    statKey: "users.total",
  },
  {
    key: "issues",
    label: "Issues & Evaluations",
    desc: "Concerns and ratings",
    icon: AlertTriangle,
    tone: "red",
    statKey: "issues.total",
  },
];

const iconToneClasses = {
  green: "bg-green-50 text-green-700 ring-green-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  teal: "bg-teal-50 text-teal-700 ring-teal-100",
  slate: "bg-slate-50 text-slate-700 ring-slate-100",
  red: "bg-red-50 text-red-700 ring-red-100",
};

function getReportCount(data, statKey) {
  if (!data || !statKey) return 0;
  const parts = statKey.split(".");
  let cur = data;
  for (const p of parts) cur = cur?.[p];
  return cur ?? 0;
}

const statusTone = {
  pending: "bg-amber-100 text-amber-700 ring-amber-200",
  approved: "bg-green-100 text-green-700 ring-green-200",
  rejected: "bg-red-100 text-red-700 ring-red-200",
  checked: "bg-green-100 text-green-700 ring-green-200",
  submitted: "bg-blue-100 text-blue-700 ring-blue-200",
  open: "bg-amber-100 text-amber-700 ring-amber-200",
  resolved: "bg-green-100 text-green-700 ring-green-200",
  closed: "bg-gray-100 text-gray-600 ring-gray-200",
  deployed: "bg-green-100 text-green-700 ring-green-200",
  verified: "bg-green-100 text-green-700 ring-green-200",
  unverified: "bg-amber-100 text-amber-700 ring-amber-200",
};

function StatusBadge({ value }) {
  const cls = statusTone[String(value)] || "bg-gray-100 text-gray-600 ring-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${cls}`}>
      {String(value).replace(/-/g, " ")}
    </span>
  );
}

function miniStat(label, value) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1 font-heading text-lg font-bold tracking-tight text-gray-900">{Number(value ?? 0).toLocaleString()}</p>
    </div>
  );
}

function OverviewView({ data }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Interns" value={data.interns.total} helper={`${data.interns.approved} approved`} icon={<GraduationCap size={18} />} tone="green" />
        <StatCard label="HTE Partners" value={data.htes.total} helper={`${data.institutes.total} institutes`} icon={<Building2 size={18} />} tone="blue" />
        <StatCard label="Requirements" value={data.requirements.total} helper={`${data.requirements.definitions_total} types`} icon={<FileText size={18} />} tone="emerald" />
        <StatCard label="Photo DTR" value={data.dtr.total} helper={`${data.journals.total} journals`} icon={<CalendarCheck size={18} />} tone="amber" />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <SectionCard title="Users by Role" subtitle="Account distribution across the system">
          <div className="space-y-2.5">
            {Object.entries(data.users.by_role).length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No users yet</p>
            ) : (
              Object.entries(data.users.by_role).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5">
                  <span className="text-sm font-medium capitalize text-gray-700">{role.replace(/_/g, " ")}</span>
                  <span className="font-heading text-sm font-bold text-gray-900">{count}</span>
                </div>
              ))
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {miniStat("Verified", data.users.verified)}
              {miniStat("Unverified", data.users.unverified)}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Interns by Institute" subtitle="Deployment per institute">
          <div className="space-y-2.5">
            {data.interns.by_institute.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No data</p>
            ) : (
              data.interns.by_institute.map((row) => (
                <div key={row.institute} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
                  <span className="min-w-0 flex-1 truncate pr-3 text-sm font-medium text-gray-700">{row.institute}</span>
                  <span className="font-heading text-sm font-bold text-green-700">{row.total}</span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Issues & Evaluations" subtitle="Concerns and performance ratings in the selected academic year">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {miniStat("Issues", data.issues.total)}
          {miniStat("Open", data.issues.by_status.open || 0)}
          {miniStat("Evaluations", data.evaluations.total)}
          {miniStat("Journals", data.journals.total)}
        </div>
      </SectionCard>
    </div>
  );
}

function InternsView({ data }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Interns" value={data.interns.total} icon={<GraduationCap size={18} />} tone="green" />
        <StatCard label="Approved" value={data.interns.approved} helper="Ready for deployment" icon={<BadgeCheck size={18} />} tone="green" />
        <StatCard label="Pending" value={data.interns.pending} helper="Awaiting approval" icon={<Clock size={18} />} tone="amber" />
        <StatCard label="Rejected" value={data.interns.rejected} helper="Needs resubmission" icon={<AlertTriangle size={18} />} tone="red" />
      </section>

      <SectionCard title="Interns by Institute" subtitle="Count of interns per institute for the selected academic year">
        {data.interns.by_institute.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No interns in this academic year</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Institute</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Interns</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.interns.by_institute.map((row) => (
                    <TableRow key={row.institute}>
                      <TableCell className="font-medium text-gray-800">{row.institute}</TableCell>
                      <TableCell className="text-right font-heading font-bold text-gray-900">{row.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Interns by Program" subtitle="Program-level distribution">
        {data.interns.by_program.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No data</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Program</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Interns</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.interns.by_program.map((row) => (
                    <TableRow key={row.program}>
                      <TableCell className="font-medium text-gray-800">{row.program}</TableCell>
                      <TableCell className="text-right font-heading font-bold text-gray-900">{row.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="OJT Deployment Status" subtitle="Current placement stage of interns">
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.interns.by_ojt_status).length === 0 ? (
            <p className="text-sm text-gray-400">No deployment data</p>
          ) : (
            Object.entries(data.interns.by_ojt_status).map(([status, count]) => (
              <span key={status} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">
                <span className="h-2 w-2 rounded-full bg-green-600" />
                <span className="capitalize">{String(status).replace(/-/g, " ")}</span>
                <span className="font-heading font-bold text-gray-900">{count}</span>
              </span>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function HtesView({ data }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total HTEs" value={data.htes.total} icon={<Building2 size={18} />} tone="blue" />
        <StatCard label="Active Institutes" value={data.institutes.total} icon={<School size={18} />} tone="amber" />
        <StatCard label="Programs" value={data.programs.total} icon={<BookOpen size={18} />} tone="green" />
      </section>

      <SectionCard title="HTE Status Breakdown" subtitle="Partner establishments by verification status">
        <div className="flex flex-wrap gap-2.5">
          {Object.entries(data.htes.by_status).length === 0 ? (
            <p className="text-sm text-gray-400">No HTE data</p>
          ) : (
            Object.entries(data.htes.by_status).map(([status, count]) => (
              <div key={status} className="inline-flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <StatusBadge value={status} />
                <span className="font-heading text-lg font-bold text-gray-900">{count}</span>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard title="Institutes" subtitle="All institutes currently configured in the system">
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Institute</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Programs</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.institutes.list || []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-gray-800">{row.name}</TableCell>
                    <TableCell className="font-heading font-semibold text-gray-700">{row.programs_count}</TableCell>
                    <TableCell>
                      <StatusBadge value={row.is_active ? "active" : "inactive"} />
                    </TableCell>
                  </TableRow>
                ))}
                {(data.institutes.list || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-gray-400">No institutes found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function AcademicView({ data }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Institutes" value={data.institutes.total} icon={<School size={18} />} tone="amber" />
        <StatCard label="Programs" value={data.programs.total} icon={<Layers size={18} />} tone="green" />
        <StatCard label="Academic Years" value={data.academic_terms.total} icon={<CalendarDays size={18} />} tone="blue" />
        <StatCard label="OJT Hours Configs" value={(data.ojt_hours || []).length} icon={<Clock size={18} />} tone="emerald" />
      </section>

      <SectionCard title="Academic Years" subtitle="All configured academic years and terms">
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Code</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Description</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Duration</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.academic_terms.list || []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs font-bold text-gray-700">{row.code}</TableCell>
                    <TableCell className="font-medium text-gray-800">{row.description}</TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {row.start_at ? new Date(row.start_at).toLocaleDateString() : "—"} – {row.end_at ? new Date(row.end_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Programs by Institute" subtitle="Program catalog across institutes">
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Program</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Institute</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.programs_list || []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-gray-800">{row.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{row.institute?.name || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge value={row.is_active ? "active" : "inactive"} />
                    </TableCell>
                  </TableRow>
                ))}
                {(data.programs_list || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-gray-400">No programs found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="OJT Hours Configuration" subtitle="Required hours per institute">
        {(data.ojt_hours || []).length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No OJT hours configured</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.ojt_hours.map((row) => (
              <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{row.institute?.name || "Institute"}</p>
                <p className="mt-1 font-heading text-2xl font-bold text-gray-900">
                  {row.hours} <span className="text-sm font-medium text-gray-500">hrs</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function RequirementsView({ data }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Requirement Types" value={data.requirements.definitions_total} icon={<ClipboardList size={18} />} tone="amber" />
        <StatCard label="Total Submissions" value={data.requirements.total} icon={<FileText size={18} />} tone="emerald" />
        <StatCard label="Approved" value={data.requirements.by_status.approved || 0} icon={<BadgeCheck size={18} />} tone="green" />
      </section>

      <SectionCard title="Submission Status" subtitle="Requirement submissions grouped by review status for the selected academic year">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Pending Review", count: data.requirements.by_status.pending || 0, tone: "amber" },
            { label: "Approved", count: data.requirements.by_status.approved || 0, tone: "green" },
            { label: "Rejected", count: data.requirements.by_status.rejected || 0, tone: "red" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{item.label}</p>
              <p className="mt-1.5 font-heading text-2xl font-bold text-gray-900">{item.count}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${item.tone === "green" ? "bg-green-500" : item.tone === "amber" ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${data.requirements.total ? (item.count / data.requirements.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {Object.keys(data.requirements.by_status).length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">No requirement submissions in this academic year</p>
        )}
      </SectionCard>
    </div>
  );
}

function DtrView({ data }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="DTR Submissions" value={data.dtr.total} icon={<CalendarCheck size={18} />} tone="blue" />
        <StatCard label="Daily Journals" value={data.journals.total} icon={<BookOpen size={18} />} tone="teal" />
        <StatCard label="Total Evaluations" value={data.evaluations.total} icon={<Star size={18} />} tone="amber" />
      </section>

      <SectionCard title="DTR Status Breakdown" subtitle="Photo DTR entries by verification status">
        <div className="flex flex-wrap gap-2.5">
          {Object.entries(data.dtr.by_status).length === 0 ? (
            <p className="text-sm text-gray-400">No DTR submissions in this academic year</p>
          ) : (
            Object.entries(data.dtr.by_status).map(([status, count]) => (
              <div key={status} className="inline-flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <StatusBadge value={status} />
                <span className="font-heading text-lg font-bold text-gray-900">{count}</span>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard title="OJT Hours Tracking" subtitle="Configured hours vs. rendered hours context">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(data.ojt_hours || []).slice(0, 6).map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <span className="text-sm font-medium text-gray-700">{row.institute?.name || "Institute"}</span>
              <span className="font-heading text-sm font-bold text-green-700">{row.hours} hrs required</span>
            </div>
          ))}
          {(data.ojt_hours || []).length === 0 && (
            <p className="col-span-2 py-4 text-center text-sm text-gray-400">No OJT hours configuration found</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function UsersView({ data }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Users" value={data.users.total} icon={<Users size={18} />} tone="green" />
        <StatCard label="Verified" value={data.users.verified} helper="Email verified" icon={<BadgeCheck size={18} />} tone="green" />
        <StatCard label="Unverified" value={data.users.unverified} helper="Pending OTP" icon={<Clock size={18} />} tone="amber" />
      </section>

      <SectionCard title="Users by Role" subtitle="System accounts grouped by assigned role">
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Role</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Accounts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.users.by_role).map(([role, count]) => (
                  <TableRow key={role}>
                    <TableCell className="font-medium capitalize text-gray-800">{role.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right font-heading font-bold text-gray-900">{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function IssuesView({ data }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Issues" value={data.issues.total} icon={<AlertTriangle size={18} />} tone="red" />
        <StatCard label="Open" value={data.issues.by_status.open || 0} icon={<AlertTriangle size={18} />} tone="amber" />
        <StatCard label="Resolved" value={data.issues.by_status.resolved || 0} icon={<BadgeCheck size={18} />} tone="green" />
        <StatCard label="Evaluations" value={data.evaluations.total} icon={<Star size={18} />} tone="amber" />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Issues by Status" subtitle="Current state of reported concerns">
          <div className="space-y-2.5">
            {Object.entries(data.issues.by_status).length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No issues in this academic year</p>
            ) : (
              Object.entries(data.issues.by_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5">
                  <StatusBadge value={status} />
                  <span className="font-heading text-sm font-bold text-gray-900">{count}</span>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Issues by Type" subtitle="Category breakdown">
          <div className="space-y-2.5">
            {Object.entries(data.issues.by_type).length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No categorized issues</p>
            ) : (
              Object.entries(data.issues.by_type).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5">
                  <span className="text-sm font-medium capitalize text-gray-700">{(type || "N/A").replace(/_/g, " ")}</span>
                  <span className="font-heading text-sm font-bold text-gray-900">{count}</span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Journals & Evaluations" subtitle="Documentation and performance reviews">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {miniStat("Journals", data.journals.total)}
          {miniStat("Evaluations", data.evaluations.total)}
          {miniStat("Programs", data.programs.total)}
        </div>
      </SectionCard>
    </div>
  );
}

const viewMap = {
  overview: OverviewView,
  interns: InternsView,
  htes: HtesView,
  academic: AcademicView,
  requirements: RequirementsView,
  dtr: DtrView,
  users: UsersView,
  issues: IssuesView,
};

export default function AdminReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [termsLoading, setTermsLoading] = useState(true);
  const [activeReport, setActiveReport] = useState("overview");
  const [isPrinting, setIsPrinting] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    api
      .get("/academic-terms/options")
      .then((res) => {
        const list = res.data.data || [];
        setAcademicYears(list);
        const active = list.find((term) => term.status === "active");
        if (active) setAcademicYearId(String(active.id));
      })
      .catch(() => {})
      .finally(() => setTermsLoading(false));
  }, []);

  const loadReport = useCallback(() => {
    if (termsLoading) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (academicYearId) params.set("academic_year_id", academicYearId);
    api
      .get(`/reports?${params.toString()}`)
      .then((res) => setData(res.data.data))
      .catch((err) => toast.error("Failed to load report", { description: firstErrorMessage(err) }))
      .finally(() => setLoading(false));
  }, [academicYearId, termsLoading]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrintExecutive = () => {
    if (isPrinting) return;
    setIsPrinting(true);
    const params = new URLSearchParams();
    if (academicYearId) params.set("academic_year_id", academicYearId);
    params.set("report", "overview");
    const printUrl = `/admin/reports/print?${params.toString()}`;

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
      if (e.data?.type === "smartlog-report-print-ready") {
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

  const ActiveView = viewMap[activeReport];
  const activeMeta = REPORTS.find((r) => r.key === activeReport);

  return (
    <AdminLayout>
      <PageHeader
        icon={BarChart3}
        title="Reports"
        subtitle="Generate and export official reports for every module — filter by academic year and print"
        action={
          <Button
            onClick={handlePrintExecutive}
            disabled={isPrinting}
            className="h-11 rounded-xl bg-white font-semibold text-green-700 shadow-sm hover:bg-green-50 disabled:opacity-60"
          >
            {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {isPrinting ? "Preparing…" : "Print Executive Report"}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={academicYearId} onValueChange={setAcademicYearId} disabled={termsLoading}>
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-[240px]">
            <SelectValue placeholder={termsLoading ? "Loading years…" : "Academic Year"} />
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
        <p className="text-xs font-medium text-gray-500">
          <span className="font-heading font-bold text-gray-900">{REPORTS.length}</span> reports available · filtered by academic year
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : !data ? (
        <p className="py-10 text-center text-sm text-red-600">Failed to load report data.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {REPORTS.map((report) => {
              const Icon = report.icon;
              const isActive = activeReport === report.key;
              const count = getReportCount(data, report.statKey);
              return (
                <button
                  key={report.key}
                  onClick={() => setActiveReport(report.key)}
                  className={`group relative flex min-h-[96px] flex-col justify-between overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md ${
                    isActive ? "border-green-200 ring-2 ring-green-500/20" : "border-gray-200"
                  }`}
                >
                  {isActive && <span className="absolute left-0 top-0 h-full w-1 bg-green-500" />}
                  <div className="flex items-start justify-between gap-2">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${iconToneClasses[report.tone] || iconToneClasses.green}`}>
                      <Icon size={16} />
                    </div>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${isActive ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-400 group-hover:bg-gray-100"}`}>
                      <ChevronRight size={14} />
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="font-heading text-sm font-bold leading-tight text-gray-900">{report.label}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{report.desc}</p>
                  </div>
                  <p className="mt-2 font-heading text-xs font-bold text-green-700">
                    {Number(count).toLocaleString()} records
                  </p>
                </button>
              );
            })}
          </div>

          <div>
            <h2 className="font-heading text-base font-bold text-gray-900 sm:text-lg">{activeMeta?.label}</h2>
            <p className="text-sm text-gray-500">{activeMeta?.desc}</p>
          </div>

          <ActiveView data={data} />
        </>
      )}
    </AdminLayout>
  );
}
