import { useEffect, useState } from "react";
import {
  Users,
  Store,
  FileText,
  ClipboardCheck,
  UserCheck,
  Clock3,
  Plus,
  ArrowRight,
  Building2,
  BadgeCheck,
  Camera,
  FolderUp,
  NotebookPen,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import StatCard from "@/components/StatCard.jsx";
import SectionCard from "@/components/SectionCard.jsx";

const mockInterns = [
  { id: 1, firstname: "Juan", lastname: "Dela Cruz", program: "BS Computer Science", status: "Verified", initials: "JD" },
  { id: 2, firstname: "Maria", lastname: "Santos", program: "BS Information Systems", status: "Unverified", initials: "MS" },
  { id: 3, firstname: "Jose", lastname: "Ramos", program: "BS Computer Science", status: "Verified", initials: "JR" },
  { id: 4, firstname: "Ana", lastname: "Lopez", program: "BS Information Systems", status: "Rejected", initials: "AL" },
  { id: 5, firstname: "Carlos", lastname: "Mendoza", program: "BS Data Science", status: "Pending", initials: "CM" },
];

const mockHTEs = [
  { name: "City Hall — ICT Office", interns: 24 },
  { name: "SMART Communications", interns: 18 },
  { name: "Tangub Community Hospital", interns: 15 },
];

const requirements = [
  { label: "OJT Manual", value: 86, tone: "bg-green-600" },
  { label: "Endorsement Letters", value: 74, tone: "bg-emerald-500" },
  { label: "Daily Time Records", value: 61, tone: "bg-teal-500" },
  { label: "Journals", value: 43, tone: "bg-green-700" },
  { label: "Post-Deployment Docs", value: 28, tone: "bg-amber-500" },
];

const statusTone = {
  Verified: "bg-green-50 text-green-700 ring-green-100",
  Unverified: "bg-amber-50 text-amber-700 ring-amber-100",
  Pending: "bg-blue-50 text-blue-700 ring-blue-100",
  Rejected: "bg-red-50 text-red-700 ring-red-100",
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export default function AdminDashboard() {
  const now = useClock();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <AdminLayout>
      <section className="rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 via-emerald-50 to-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-sm font-medium text-green-600">{greeting}</p>
            <h1 className="font-heading mb-2 text-2xl font-bold text-green-950 sm:text-3xl">
              Welcome back, Admin
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 font-mono text-xs font-semibold text-green-700">
                ADMIN
              </span>
              <span className="text-gray-500">{date}</span>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">
              Here's what's happening across the OJT program today — monitor interns, verify records, and keep
              requirements on track.
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-green-100 backdrop-blur sm:px-5">
            <div className="font-heading text-3xl font-bold text-green-900 sm:text-4xl">{time}</div>
            <p className="mt-1 text-xs text-gray-500">Current time</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Interns" value={247} helper="123 deployed this term" icon={<Users size={20} />} tone="blue" />
        <StatCard label="Active HTEs" value={18} helper="3 pending approval" icon={<Store size={20} />} tone="emerald" />
        <StatCard label="Pending Requirements" value={64} helper="12 flagged as incomplete" icon={<FileText size={20} />} tone="amber" />
        <StatCard label="Evaluations Due" value={29} helper="This week" icon={<ClipboardCheck size={20} />} tone="red" />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent Interns"
            subtitle="Latest registrations and verification status"
            action={
              <Button asChild className="h-10 rounded-xl bg-green-600 px-4 font-semibold text-white hover:bg-green-700">
                <a href="#interns">
                  View All <ArrowRight size={16} />
                </a>
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                    <th className="pb-3 pr-4 font-semibold">Intern</th>
                    <th className="pb-3 pr-4 font-semibold">Program</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    <th className="pb-3 text-right font-semibold">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {mockInterns.map((intern) => (
                    <tr key={intern.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                              {intern.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-green-900">
                              {intern.firstname} {intern.lastname}
                            </p>
                            <p className="truncate text-xs text-gray-400">intern@tcgc.edu.ph</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{intern.program}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusTone[intern.status]}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {intern.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className="rounded bg-green-100 px-2 py-0.5 font-mono text-xs font-semibold text-green-800">
                          #{1000 + intern.id}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <SectionCard title="Requirements Overview" subtitle="Submission completion per requirement type">
            <div className="space-y-4">
              {requirements.map((req) => (
                <div key={req.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{req.label}</span>
                    <span className="font-mono text-xs font-semibold text-gray-500">{req.value}%</span>
                  </div>
                  <Progress value={req.value} className="h-2 bg-gray-100 [&>div]:bg-green-600" />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Quick Actions"
            subtitle="Common administrative tasks"
            className="hidden sm:block"
          >
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-12 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700">
                <Plus size={16} /> Add Intern
              </Button>
              <Button variant="outline" className="h-12 rounded-xl border-green-200 font-semibold text-green-700 hover:bg-green-50">
                <Camera size={16} /> Verify DTR
              </Button>
              <Button variant="outline" className="h-12 rounded-xl border-green-200 font-semibold text-green-700 hover:bg-green-50">
                <FolderUp size={16} /> Requirements
              </Button>
              <Button variant="outline" className="h-12 rounded-xl border-green-200 font-semibold text-green-700 hover:bg-green-50">
                <BarChart3 size={16} /> Reports
              </Button>
            </div>
          </SectionCard>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <SectionCard
          title="Host Training Establishments"
          subtitle="Active partners and assigned interns"
          action={<Building2 size={18} className="text-gray-300" />}
        >
          <div className="space-y-3">
            {mockHTEs.map((hte) => (
              <div key={hte.name} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                    <Store size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{hte.name}</span>
                </div>
                <span className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                  <BadgeCheck size={16} className="text-green-600" /> {hte.interns} interns
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Activity"
          subtitle="Latest actions across the system"
          action={<Clock3 size={18} className="text-gray-300" />}
        >
          <div className="space-y-3">
            {[
              { icon: UserCheck, text: "Carlos Mendoza's registration was approved", time: "2 min ago" },
              { icon: Camera, text: "Ana Lopez submitted a photo DTR entry", time: "18 min ago" },
              { icon: NotebookPen, text: "Maria Santos posted a new journal entry", time: "1 hr ago" },
              { icon: FolderUp, text: "Juan Dela Cruz uploaded endorsement letter", time: "3 hrs ago" },
              { icon: Building2, text: "City Hall — ICT Office was updated", time: "Yesterday" },
            ].map(({ icon: Icon, text, time }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-700">{text}</p>
                  <p className="text-xs text-gray-400">{time}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </AdminLayout>
  );
}
