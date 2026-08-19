import { BookOpenText, LayoutDashboard, Users } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const navItems = [
  { to: "/hte", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/hte/interns", label: "Assigned Interns", icon: Users },
  { to: "/hte/monitoring", label: "Intern Monitoring", icon: BookOpenText },
];

export default function HteLayout({ children }) {
  return (
    <AppShell navItems={navItems} bottomNavItems={navItems} portalLabel="HTE PORTAL">
      {children}
    </AppShell>
  );
}
