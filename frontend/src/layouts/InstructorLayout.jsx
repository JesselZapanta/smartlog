import { LayoutDashboard } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const navItems = [{ to: "/instructor", label: "Dashboard", icon: LayoutDashboard, end: true }];

export default function InstructorLayout({ children }) {
  return (
    <AppShell navItems={navItems} bottomNavItems={navItems} portalLabel="INSTRUCTOR PORTAL">
      {children}
    </AppShell>
  );
}
