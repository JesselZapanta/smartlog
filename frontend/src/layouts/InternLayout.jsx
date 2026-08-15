import { Camera, FileText, LayoutDashboard } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";
import { useAuth } from "@/contexts/AuthContext";

const dashboardNav = [
  { to: "/intern", label: "Dashboard", icon: LayoutDashboard, end: true },
];

const fullNav = [
  ...dashboardNav,
  { to: "/intern/requirements", label: "Requirements", icon: FileText },
  { to: "/intern/photo-dtr", label: "Photo DTR", icon: Camera },
];

export default function InternLayout({ children }) {
  const { user } = useAuth();
  const approved = user?.registration_status === "approved";
  const navItems = approved ? fullNav : dashboardNav;

  return (
    <AppShell navItems={navItems} bottomNavItems={navItems} portalLabel="INTERN PORTAL">
      {children}
    </AppShell>
  );
}
