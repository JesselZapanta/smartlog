import { useEffect, useState } from "react";
import { Users, GraduationCap, Store, BookOpen, Loader2, ShieldAlert } from "lucide-react";
import InstructorLayout from "@/layouts/InstructorLayout.jsx";
import DashboardBanner from "@/components/DashboardBanner.jsx";
import StatCard from "@/components/StatCard.jsx";
import SectionCard from "@/components/SectionCard.jsx";
import InternsTable from "@/components/InternsTable.jsx";
import { Progress } from "@/components/ui/progress";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";

export default function InstructorDashboard() {
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
    <InstructorLayout>
      <DashboardBanner
        roleLabel="INSTRUCTOR"
        subtitle="Monitor intern progress, review journals and DTR entries for your institute."
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-600">{error}</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Interns" value={data.stats.interns} helper="Registered accounts" icon={<Users size={20} />} tone="blue" />
            <StatCard label="Verified Interns" value={data.stats.verified_interns} helper={`${data.stats.interns - data.stats.verified_interns} pending email OTP`} icon={<ShieldAlert size={20} />} tone="green" />
            <StatCard label="Host Training Est." value={data.stats.htes} helper="Partner organizations" icon={<Store size={20} />} tone="emerald" />
            <StatCard label="Programs" value={data.stats.programs} helper="Available programs" icon={<BookOpen size={20} />} tone="amber" />
          </section>

          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionCard
                title="Recent Interns"
                subtitle="Latest registrations and verification status"
                action={<GraduationCap size={18} className="text-gray-300" />}
              >
                <InternsTable rows={data.recent_interns} />
              </SectionCard>
            </div>

            <SectionCard title="Interns by Program" subtitle="Distribution across programs">
              {data.programs.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No interns assigned to programs yet.</p>
              ) : (
                <div className="space-y-4">
                  {data.programs.map((program) => (
                    <div key={program.name}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="truncate font-medium text-gray-700">{program.name}</span>
                        <span className="font-mono text-xs font-semibold text-gray-500">{program.intern_count}</span>
                      </div>
                      <Progress
                        value={(program.intern_count / Math.max(...data.programs.map((p) => p.intern_count), 1)) * 100}
                        className="h-2 bg-gray-100 [&>div]:bg-green-600"
                      />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </section>
        </>
      )}
    </InstructorLayout>
  );
}