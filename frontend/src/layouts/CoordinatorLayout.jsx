import { LayoutDashboard, ClipboardCheck, Users, Store, FileText, ClipboardList } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const navItems = [
  { to: "/coordinator", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/coordinator/registrations", label: "Registrations", icon: ClipboardCheck },
  { to: "/coordinator/interns", label: "Approved Interns", icon: Users },
  { to: "/coordinator/htes", label: "HTE Management", icon: Store },
  { to: "/coordinator/requirements", label: "Requirements", icon: FileText },
  { to: "/coordinator/intern-requirements", label: "Intern Requirements", icon: ClipboardList },
];

export default function CoordinatorLayout({ children }) {
  return (
    <AppShell navItems={navItems} bottomNavItems={navItems} portalLabel="COORDINATOR PORTAL">
      {children}
    </AppShell>
  );
}
