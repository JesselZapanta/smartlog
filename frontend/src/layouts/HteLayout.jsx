import { LayoutDashboard } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const navItems = [{ to: "/hte", label: "Dashboard", icon: LayoutDashboard, end: true }];

export default function HteLayout({ children }) {
  return (
    <AppShell navItems={navItems} bottomNavItems={navItems} portalLabel="HTE PORTAL">
      {children}
    </AppShell>
  );
}
