import { BookOpenText, LayoutDashboard, Users } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const navItems = [
  { to: "/instructor", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/instructor/interns", label: "Deployed Interns", icon: Users },
  { to: "/instructor/monitoring", label: "Intern Monitoring", icon: BookOpenText },
];

export default function InstructorLayout({ children }) {
  return (
    <AppShell navItems={navItems} bottomNavItems={navItems} portalLabel="INSTRUCTOR PORTAL">
      {children}
    </AppShell>
  );
}
