import { AlertTriangle, BarChart3, BookOpenText, ClipboardCheck, LayoutDashboard, Users } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const navItems = [
  { to: "/hte", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/hte/interns", label: "Assigned Interns", icon: Users },
  { to: "/hte/monitoring", label: "Intern Monitoring", icon: BookOpenText },
  { to: "/hte/evaluations", label: "Evaluate Interns", icon: ClipboardCheck },
  { to: "/hte/issues", label: "Issues", icon: AlertTriangle },
  { to: "/hte/reports", label: "Report", icon: BarChart3 },
];

const bottomNav = [
  { to: "/hte", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/hte/interns", label: "Assigned Interns", icon: Users },
  { to: "/hte/monitoring", label: "Intern Monitoring", icon: BookOpenText },
  { to: "/hte/reports", label: "Report", icon: BarChart3 },
];

export default function HteLayout({ children }) {
  return (
    <AppShell navItems={navItems} bottomNavItems={bottomNav} portalLabel="HTE PORTAL">
      {children}
    </AppShell>
  );
}
