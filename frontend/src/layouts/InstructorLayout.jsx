import {
  ArrowLeftRight,
  BarChart3,
  BookOpenText,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Users,
} from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const navItems = [
  { to: "/instructor", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/instructor/interns", label: "Deployed Interns", icon: Users },
  { to: "/instructor/monitoring", label: "Intern Monitoring", icon: BookOpenText },
  { to: "/instructor/intern-evaluations", label: "Intern Evaluations", icon: ClipboardCheck },
  { to: "/instructor/intern-grades", label: "Intern Grade", icon: GraduationCap },
  { to: "/instructor/transfer-requests", label: "Transfer Requests", icon: ArrowLeftRight },
  { to: "/instructor/reports", label: "Report", icon: BarChart3 },
];

// The mobile bottom bar holds five slots, so the sidebar item above is left out
// of it — it stays reachable from the More drawer.
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
