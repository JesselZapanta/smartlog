import { LayoutDashboard, ClipboardCheck, Users, Store, FileText, ClipboardList, UserCheck, Star, FileCheck, Building2 } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const navItems = [
  { to: "/coordinator", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/coordinator/registrations", label: "Registrations", icon: ClipboardCheck },
  { to: "/coordinator/interns", label: "Approved Interns", icon: Users },
  { to: "/coordinator/htes", label: "HTE Management", icon: Store },
  { to: "/coordinator/hte-assignments", label: "Assigned Interns", icon: UserCheck },
  { to: "/coordinator/requirements", label: "Requirements", icon: FileText },
  { to: "/coordinator/intern-requirements", label: "Intern Requirements", icon: ClipboardList },
  { to: "/coordinator/evaluations", label: "Evaluations", icon: Star },
  { to: "/coordinator/intern-evaluations", label: "Intern Evaluations", icon: FileCheck },
  { to: "/coordinator/hte-evaluations", label: "HTE Evaluations", icon: Building2 },
];

export default function CoordinatorLayout({ children }) {
  return (
    <AppShell navItems={navItems} bottomNavItems={navItems} portalLabel="COORDINATOR PORTAL">
      {children}
    </AppShell>
  );
}
