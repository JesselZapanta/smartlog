import { AlertTriangle, BarChart3, BookOpenText, Camera, ClipboardCheck, ClipboardList, FileText, LayoutDashboard } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";
import { useAuth } from "@/contexts/AuthContext";

const dashboardNav = [
  { to: "/intern", label: "Dashboard", icon: LayoutDashboard, end: true },
];

const fullNav = [
  ...dashboardNav,
  { to: "/intern/photo-dtr", label: "Photo DTR", icon: Camera },
  { to: "/intern/dtr-logs", label: "DTR Logs", icon: ClipboardList },
  { to: "/intern/journals", label: "Daily Journal", icon: BookOpenText },
  { to: "/intern/requirements", label: "Requirements", icon: FileText },
  { to: "/intern/issues", label: "Issues", icon: AlertTriangle },
  { to: "/intern/evaluations", label: "Evaluate HTE", icon: ClipboardCheck },
  { to: "/intern/reports", label: "Report", icon: BarChart3 },
];

const bottomNavApproved = [
  { to: "/intern", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/intern/photo-dtr", label: "Photo DTR", icon: Camera },
  { to: "/intern/dtr-logs", label: "DTR Logs", icon: ClipboardList },
  { to: "/intern/journals", label: "Daily Journal", icon: BookOpenText },
];

export default function InternLayout({ children }) {
  const { user } = useAuth();
  const approved = user?.registration_status === "approved";
  const navItems = approved ? fullNav : dashboardNav;
  const bottomNavItems = approved ? bottomNavApproved : dashboardNav;

  return (
    <AppShell navItems={navItems} bottomNavItems={bottomNavItems} portalLabel="INTERN PORTAL">
      {children}
    </AppShell>
  );
}
