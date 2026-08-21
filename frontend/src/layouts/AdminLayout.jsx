import { CalendarDays, School, BookOpen, LayoutDashboard, Users, FileText, Store, BarChart3, ShieldCheck, Clock } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const settingsGroupNav = [
  { to: "/admin/academic-years", label: "Academic Year", icon: CalendarDays },
  { to: "/admin/institutes", label: "Institutes", icon: School },
  { to: "/admin/programs", label: "Programs", icon: BookOpen },
  { to: "/admin/ojt-hours", label: "OJT Hours", icon: Clock },
];

const sidebarNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "User Management", icon: ShieldCheck },
  { to: "/admin/interns", label: "Interns", icon: Users },
  { to: "/admin/htes", label: "Host Training Est.", icon: Store },
  { to: "/admin/requirements", label: "Requirements", icon: FileText },
  { to: "/admin/reports", label: "Report", icon: BarChart3 },
];

const bottomNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/interns", label: "Interns", icon: Users },
  { to: "/admin/htes", label: "HTE", icon: Store },
  { to: "/admin/reports", label: "Report", icon: BarChart3 },
];

export default function AdminLayout({ children }) {
  return (
    <AppShell navItems={sidebarNav} bottomNavItems={bottomNav} portalLabel="ADMIN PANEL" settingsGroupNav={settingsGroupNav}>
      {children}
    </AppShell>
  );
}
