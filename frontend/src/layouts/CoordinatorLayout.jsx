import { LayoutDashboard, ClipboardCheck, Users } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const navItems = [
  { to: "/coordinator", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/coordinator/registrations", label: "Registrations", icon: ClipboardCheck },
  { to: "/coordinator/interns", label: "Interns", icon: Users },
];

export default function CoordinatorLayout({ children }) {
  return (
    <AppShell navItems={navItems} bottomNavItems={navItems} portalLabel="COORDINATOR PORTAL">
      {children}
    </AppShell>
  );
}
