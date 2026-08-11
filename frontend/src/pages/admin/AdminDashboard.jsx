import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Store, GraduationCap, ShieldAlert, Loader2, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import DashboardBanner from "@/components/DashboardBanner.jsx";
import StatCard from "@/components/StatCard.jsx";
import SectionCard from "@/components/SectionCard.jsx";
import InternsTable from "@/components/InternsTable.jsx";
import StatusChip from "@/components/StatusChip.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";

export default function AdminDashboard() {
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
    <AdminLayout>
      <DashboardBanner
        roleLabel="ADMIN"
        subtitle="Here's what's happening across the OJT program today — monitor interns, verify records, and keep requirements on track."
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
            <StatCard label="Total Users" value={data.stats.total_users} helper={`${data.stats.admins} admin account${data.stats.admins === 1 ? "" : "s"}`} icon={<Users size={20} />} tone="blue" />
            <StatCard label="Interns" value={data.stats.interns} helper={`${data.stats.ojt_instructors} instructors`} icon={<GraduationCap size={20} />} tone="green" />
            <StatCard label="Host Training Est." value={data.stats.htes} helper={`${data.stats.ojt_coordinators} coordinators`} icon={<Store size={20} />} tone="emerald" />
            <StatCard label="Unverified Users" value={data.stats.unverified_users} helper="Awaiting email OTP" icon={<ShieldAlert size={20} />} tone="amber" />
          </section>

          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionCard
                title="Recent Interns"
                subtitle="Latest registrations and verification status"
                action={
                  <Button asChild className="h-10 rounded-xl bg-green-600 px-4 font-semibold text-white hover:bg-green-700">
                    <Link to="/admin/users?role=intern">
                      View All <ArrowRight size={16} />
                    </Link>
                  </Button>
                }
              >
                <InternsTable rows={data.recent_interns} />
              </SectionCard>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <SectionCard title="Accounts by Role" subtitle="User distribution across the system">
                <div className="space-y-4">
                  {data.role_breakdown.map((item) => {
                    const max = Math.max(...data.role_breakdown.map((r) => r.count), 1);
                    return (
                      <div key={item.role}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">{item.label}</span>
                          <span className="font-mono text-xs font-semibold text-gray-500">{item.count}</span>
                        </div>
                        <Progress value={(item.count / max) * 100} className="h-2 bg-gray-100 [&>div]:bg-green-600" />
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard title="System Setup" subtitle="Institutes, programs and academic years">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Institutes", value: data.stats.institutes },
                    { label: "Programs", value: data.stats.programs },
                    { label: "Academic Years", value: data.stats.academic_terms },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-gray-50 p-3 text-center">
                      <p className="text-2xl font-bold text-green-900">{item.value}</p>
                      <p className="mt-1 text-xs font-medium text-gray-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            <SectionCard
              title="Host Training Establishments"
              subtitle="Active partners and their current status"
              action={<Building2 size={18} className="text-gray-300" />}
            >
              {data.recent_htes.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No HTE records yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.recent_htes.map((hte) => (
                    <div key={hte.uuid} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                          <Store size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-700">{hte.name}</p>
                          <p className="truncate text-xs text-gray-400">
                            {hte.program || "—"}
                            {hte.institute ? ` · ${hte.institute}` : ""}
                          </p>
                        </div>
                      </div>
                      <StatusChip status={hte.status} />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Pending Verifications"
              subtitle="Accounts still waiting for their email OTP"
              action={<ShieldAlert size={18} className="text-gray-300" />}
            >
              {data.recent_interns.filter((i) => !i.email_verified_at).length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  All accounts are verified. Nice work!
                </p>
              ) : (
                <div className="space-y-3">
                  {data.recent_interns
                    .filter((i) => !i.email_verified_at)
                    .slice(0, 5)
                    .map((intern) => (
                      <div key={intern.uuid} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-700">{intern.full_name}</p>
                          <p className="truncate text-xs text-gray-400">{intern.email}</p>
                        </div>
                        <StatusChip status="pending" />
                      </div>
                    ))}
                </div>
              )}
            </SectionCard>
          </section>
        </>
      )}
    </AdminLayout>
  );
}
