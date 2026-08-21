import { BarChart3, BookOpenText, ClipboardCheck, LayoutDashboard, Users } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const navItems = [
  { to: "/instructor", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/instructor/interns", label: "Deployed Interns", icon: Users },
  { to: "/instructor/monitoring", label: "Intern Monitoring", icon: BookOpenText },
  { to: "/instructor/intern-evaluations", label: "Intern Evaluations", icon: ClipboardCheck },
  { to: "/instructor/reports", label: "Report", icon: BarChart3 },
];

const bottomNav = [
  { to: "/instructor", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/instructor/interns", label: "Deployed Interns", icon: Users },
  { to: "/instructor/monitoring", label: "Intern Monitoring", icon: BookOpenText },
  { to: "/instructor/reports", label: "Report", icon: BarChart3 },
];

export default function InstructorLayout({ children }) {
  return (
    <AppShell navItems={navItems} bottomNavItems={bottomNav} portalLabel="INSTRUCTOR PORTAL">
      {children}
    </AppShell>
  );
}
