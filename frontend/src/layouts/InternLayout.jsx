import { LayoutDashboard } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const navItems = [{ to: "/intern", label: "Dashboard", icon: LayoutDashboard, end: true }];

export default function InternLayout({ children }) {
  return (
    <AppShell navItems={navItems} bottomNavItems={navItems} portalLabel="INTERN PORTAL">
      {children}
    </AppShell>
  );
}
