import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
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
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";

const tabs = [
  { key: "overview", label: "Overview", icon: BookOpen },
  { key: "interns", label: "Interns", icon: GraduationCap },
  { key: "htes", label: "HTEs", icon: Building2 },
  { key: "dtr", label: "DTR", icon: CalendarCheck },
  { key: "requirements", label: "Requirements", icon: FileText },
  { key: "issues", label: "Issues", icon: AlertTriangle },
  { key: "users", label: "Users", icon: Users },
];

const statusTone = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  checked: "bg-green-100 text-green-700",
  submitted: "bg-blue-100 text-blue-700",
  open: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
  "in-progress": "bg-blue-100 text-blue-700",
  deployed: "bg-green-100 text-green-700",
  "not-deployed": "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  verified: "bg-green-100 text-green-700",
  unverified: "bg-amber-100 text-amber-700",
};

function StatusBadge({ value }) {
  const cls = statusTone[value] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {String(value).replace(/-/g, " ")}
    </span>
  );
}

function SummaryCard({ label, value, icon, tone = "text-gray-900" }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
          <p className={`font-heading text-2xl font-bold ${tone}`}>{Number(value ?? 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ data }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <SummaryCard label="Total Users" value={data.users.total} icon={<Users size={18} />} />
        <SummaryCard label="Total Interns" value={data.interns.total} icon={<GraduationCap size={18} />} tone="text-green-700" />
        <SummaryCard label="Approved Interns" value={data.interns.approved} icon={<GraduationCap size={18} />} tone="text-green-700" />
        <SummaryCard label="Pending Interns" value={data.interns.pending} icon={<GraduationCap size={18} />} tone="text-amber-700" />
        <SummaryCard label="HTE Partners" value={data.htes.total} icon={<Building2 size={18} />} tone="text-emerald-700" />
        <SummaryCard label="Photo DTR" value={data.dtr.total} icon={<CalendarCheck size={18} />} tone="text-blue-700" />
        <SummaryCard label="Journals" value={data.journals.total} icon={<BookOpen size={18} />} tone="text-teal-700" />
        <SummaryCard label="Requirements" value={data.requirements.total} icon={<FileText size={18} />} tone="text-violet-700" />
        <SummaryCard label="Issues" value={data.issues.total} icon={<AlertTriangle size={18} />} tone="text-red-700" />
        <SummaryCard label="Evaluations" value={data.evaluations.total} icon={<Star size={18} />} tone="text-amber-700" />
        <SummaryCard label="Programs" value={data.programs.total} icon={<BookOpen size={18} />} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-700">Users by Role</h3>
          <div className="space-y-2">
            {Object.entries(data.users.by_role).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm capitalize text-gray-600">{role.replace(/_/g, " ")}</span>
                <span className="font-mono text-sm font-bold text-gray-800">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-700">Interns by Institute</h3>
          <div className="space-y-2">
            {data.interns.by_institute.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">No data</p>
            ) : (
              data.interns.by_institute.map((row) => (
                <div key={row.institute} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{row.institute}</span>
                  <span className="font-mono text-sm font-bold text-gray-800">{row.total}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function InternsTab({ data }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total" value={data.interns.total} icon={<GraduationCap size={18} />} />
        <SummaryCard label="Approved" value={data.interns.approved} icon={<GraduationCap size={18} />} tone="text-green-700" />
        <SummaryCard label="Pending" value={data.interns.pending} icon={<GraduationCap size={18} />} tone="text-amber-700" />
        <SummaryCard label="Rejected" value={data.interns.rejected} icon={<GraduationCap size={18} />} tone="text-red-700" />
      </section>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-gray-700">Interns by Institute</h3>
        {data.interns.by_institute.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No data</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institute</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.interns.by_institute.map((row) => (
                  <TableRow key={row.institute}>
                    <TableCell className="font-medium">{row.institute}</TableCell>
                    <TableCell className="text-right font-mono">{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-gray-700">Interns by Program</h3>
        {data.interns.by_program.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No data</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.interns.by_program.map((row) => (
                  <TableRow key={row.program}>
                    <TableCell className="font-medium">{row.program}</TableCell>
                    <TableCell className="text-right font-mono">{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-gray-700">OJT Status Breakdown</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(data.interns.by_ojt_status).map(([status, count]) => (
            <div key={status} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{status.replace(/-/g, " ")}</p>
              <p className="font-heading text-xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
          {Object.keys(data.interns.by_ojt_status).length === 0 && (
            <p className="text-sm text-gray-400">No data</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HtesTab({ data }) {
  return (
    <div className="space-y-6">
      <SummaryCard label="Total HTEs" value={data.htes.total} icon={<Building2 size={18} />} tone="text-emerald-700" />
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-gray-700">HTEs by Status</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(data.htes.by_status).map(([status, count]) => (
            <div key={status} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2">
              <StatusBadge value={status} />
              <p className="mt-1 font-heading text-xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
          {Object.keys(data.htes.by_status).length === 0 && (
            <p className="text-sm text-gray-400">No data</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DtrTab({ data }) {
  return (
    <div className="space-y-6">
      <SummaryCard label="Total DTR Submissions" value={data.dtr.total} icon={<CalendarCheck size={18} />} tone="text-blue-700" />
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-gray-700">DTR by Status</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(data.dtr.by_status).map(([status, count]) => (
            <div key={status} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2">
              <StatusBadge value={status} />
              <p className="mt-1 font-heading text-xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
          {Object.keys(data.dtr.by_status).length === 0 && (
            <p className="text-sm text-gray-400">No data</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RequirementsTab({ data }) {
  return (
    <div className="space-y-6">
      <SummaryCard label="Total Requirement Submissions" value={data.requirements.total} icon={<FileText size={18} />} tone="text-violet-700" />
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-gray-700">Requirements by Status</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(data.requirements.by_status).map(([status, count]) => (
            <div key={status} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2">
              <StatusBadge value={status} />
              <p className="mt-1 font-heading text-xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
          {Object.keys(data.requirements.by_status).length === 0 && (
            <p className="text-sm text-gray-400">No data</p>
          )}
        </div>
      </div>
    </div>
  );
}

function IssuesTab({ data }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard label="Total Issues" value={data.issues.total} icon={<AlertTriangle size={18} />} tone="text-red-700" />
        <SummaryCard label="Open" value={data.issues.by_status.open || 0} icon={<AlertTriangle size={18} />} tone="text-amber-700" />
        <SummaryCard label="Resolved" value={data.issues.by_status.resolved || 0} icon={<AlertTriangle size={18} />} tone="text-green-700" />
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-700">Issues by Status</h3>
          <div className="space-y-2">
            {Object.entries(data.issues.by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge value={status} />
                <span className="font-mono text-sm font-bold text-gray-800">{count}</span>
              </div>
            ))}
            {Object.keys(data.issues.by_status).length === 0 && (
              <p className="py-4 text-center text-xs text-gray-400">No data</p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-700">Issues by Type</h3>
          <div className="space-y-2">
            {Object.entries(data.issues.by_type).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm capitalize text-gray-600">{type?.replace(/_/g, " ") || "N/A"}</span>
                <span className="font-mono text-sm font-bold text-gray-800">{count}</span>
              </div>
            ))}
            {Object.keys(data.issues.by_type).length === 0 && (
              <p className="py-4 text-center text-xs text-gray-400">No data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ data }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard label="Total Users" value={data.users.total} icon={<Users size={18} />} />
        <SummaryCard label="Verified" value={data.users.verified} icon={<Users size={18} />} tone="text-green-700" />
        <SummaryCard label="Unverified" value={data.users.unverified} icon={<Users size={18} />} tone="text-amber-700" />
      </section>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-gray-700">Users by Role</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(data.users.by_role).map(([role, count]) => (
                <TableRow key={role}>
                  <TableCell className="font-medium capitalize">{role.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-right font-mono">{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default function AdminReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [termsLoading, setTermsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const iframeRef = useRef(null);

  useEffect(() => {
    api
      .get("/academic-terms/options")
      .then((res) => {
        const list = res.data.data || [];
        setAcademicYears(list);
        const active = list.find((term) => term.status === "active");
        if (active) {
          setAcademicYearId(String(active.id));
        }
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

  const handlePrint = () => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
    const params = new URLSearchParams();
    if (academicYearId) params.set("academic_year_id", academicYearId);
    params.set("source", window.location.origin);
    const printUrl = `/admin/reports/print?${params.toString()}`;

    if (iframeRef.current) {
      iframeRef.current.src = printUrl;
    } else {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.inset = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.zIndex = "9999";
      iframeRef.current = iframe;
      document.body.appendChild(iframe);
      iframe.src = printUrl;
    }

    const handler = (e) => {
      if (e.data?.type === "smartlog-report-print-ready") {
        setTimeout(() => {
          try {
            iframeRef.current?.contentWindow?.print();
          } catch {}
        }, 250);
        window.removeEventListener("message", handler);
      }
    };
    window.addEventListener("message", handler);
  };

  const yearLabel = academicYears.find((t) => String(t.id) === academicYearId);

  const TabContent = {
    overview: OverviewTab,
    interns: InternsTab,
    htes: HtesTab,
    dtr: DtrTab,
    requirements: RequirementsTab,
    issues: IssuesTab,
    users: UsersTab,
  }[activeTab];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900 sm:text-2xl">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            System-wide analytics and summary across all modules
            {yearLabel ? ` for ${yearLabel.description || yearLabel.code}` : ""}
          </p>
        </div>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="inline-flex h-11 items-center gap-2 rounded-xl"
        >
          <Printer size={16} /> Print / Save as PDF
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={academicYearId}
          onValueChange={setAcademicYearId}
          disabled={termsLoading}
        >
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-[220px]">
            <SelectValue placeholder={termsLoading ? "Loading years\u2026" : "Academic Year"} />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((term) => (
              <SelectItem key={term.id} value={String(term.id)}>
                {term.description || term.code}
                {term.status === "active" ? " \u00B7 Active" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-100 bg-gray-50 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-white text-green-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : !data ? (
        <p className="py-10 text-center text-sm text-red-600">Failed to load report data.</p>
      ) : (
        <TabContent data={data} />
      )}
    </AdminLayout>
  );
}
