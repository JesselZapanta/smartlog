import { AlertTriangle, ArrowLeftRight, BarChart3, LayoutDashboard, ClipboardCheck, Users, Store, FileText, ClipboardList, UserCheck, Star, FileCheck, Building2, RefreshCw } from "lucide-react";
import AppShell from "@/layouts/AppShell.jsx";

const navItems = [
  { to: "/coordinator", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/coordinator/htes", label: "HTE Management", icon: Store },
];

const footerNavItems = [
  { to: "/coordinator/intern-issues", label: "Intern Issues & Concerns", icon: AlertTriangle },
  { to: "/coordinator/hte-issues", label: "HTE Issues & Concerns", icon: AlertTriangle },
  { to: "/coordinator/reports", label: "Report", icon: BarChart3 },
];

const navGroups = [
  {
    label: "Interns",
    icon: Users,
    items: [
      { to: "/coordinator/registrations", label: "Registrations", icon: ClipboardCheck },
      { to: "/coordinator/interns", label: "Approved Interns", icon: Users },
      { to: "/coordinator/enrollments", label: "OJT Enrollments", icon: RefreshCw },
      { to: "/coordinator/hte-assignments", label: "Assigned Interns", icon: UserCheck },
      { to: "/coordinator/transfer-requests", label: "Transfers", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Requirements",
    icon: FileText,
    items: [
      { to: "/coordinator/requirements", label: "Requirements", icon: FileText },
      { to: "/coordinator/intern-requirements", label: "Intern Requirements", icon: ClipboardList },
    ],
  },
  {
    label: "Evaluations",
    icon: Star,
    items: [
      { to: "/coordinator/evaluations", label: "Evaluations", icon: Star },
      { to: "/coordinator/intern-evaluations", label: "Intern Evaluations", icon: FileCheck },
      { to: "/coordinator/hte-evaluations", label: "HTE Evaluations", icon: Building2 },
    ],
  },
];

const bottomNav = [
  { to: "/coordinator", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/coordinator/interns", label: "Approved Interns", icon: Users },
  { to: "/coordinator/intern-issues", label: "Intern Issues & Concerns", mobileLabel: "Intern Issues", icon: AlertTriangle },
  { to: "/coordinator/hte-issues", label: "HTE Issues & Concerns", mobileLabel: "HTE Issues", icon: AlertTriangle },
  { to: "/coordinator/reports", label: "Report", icon: BarChart3 },
];

export default function CoordinatorLayout({ children }) {
  return (
    <AppShell navItems={navItems} bottomNavItems={bottomNav} navGroups={navGroups} footerNavItems={footerNavItems} portalLabel="COORDINATOR PORTAL">
      {children}
    </AppShell>
  );
}
