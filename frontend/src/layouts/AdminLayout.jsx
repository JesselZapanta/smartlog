import { useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  FileText,
  Store,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  Camera,
  CalendarDays,
  School,
  BookOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { LogoMark } from "@/components/Logo.jsx";

const settingsGroupNav = [
  { to: "/admin/academic-years", label: "Academic Year", icon: CalendarDays },
  { to: "/admin/institutes", label: "Institutes", icon: School },
  { to: "/admin/programs", label: "Programs", icon: BookOpen },
];

const settingsGroupPaths = settingsGroupNav.map((item) => item.to);

const sidebarNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "User Management", icon: ShieldCheck },
  { to: "/admin/interns", label: "Interns", icon: Users },
  { to: "/admin/requirements", label: "Requirements", icon: FileText },
  { to: "/admin/htes", label: "Host Training Est.", icon: Store },
  { to: "/admin/evaluations", label: "Evaluations", icon: ClipboardCheck },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
];

const bottomNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/interns", label: "Interns", icon: Users },
  { to: "/admin/dtr", label: "DTR", icon: Camera },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function SidebarNavItem({ to, label, icon: Icon, end, compact }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-[9px] no-underline transition-[background] duration-150 ${
          compact ? "px-3 py-2 text-sm" : "px-3 py-2.5 font-body text-[0.9rem]"
        } ${isActive ? "font-semibold" : "font-normal"}`
      }
      style={({ isActive }) => ({
        color: isActive ? "white" : "rgba(255,255,255,0.7)",
        background: isActive ? "rgba(34,197,94,0.25)" : "transparent",
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={compact ? 16 : 18} className={isActive ? "text-[#86efac]" : "text-white/40"} />
          {label}
        </>
      )}
    </NavLink>
  );
}

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const initials = getInitials(user?.full_name);
  const [settingsOpen, setSettingsOpen] = useState(() =>
    settingsGroupPaths.some((path) => location.pathname.startsWith(path))
  );
  const childActive = settingsGroupPaths.some((path) => location.pathname.startsWith(path));

  async function handleLogout() {
    await logout();
    toast.success("Logged out", { description: "See you next time!" });
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col bg-green-950 shadow-[2px_0_20px_rgba(0,0,0,0.18)] lg:flex">
        <div className="border-b border-white/10 px-5 py-6">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <LogoMark size={32} className="drop-shadow-md" />
            <div>
              <div className="font-heading text-[0.95rem] font-bold text-white">SMARTLOG</div>
              <div className="font-mono text-[0.68rem] text-[#86efac]">ADMIN PANEL</div>
            </div>
          </Link>
        </div>
        <nav className="scrollbar-sidebar flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {sidebarNav.map((item) => (
            <SidebarNavItem key={item.to} {...item} />
          ))}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
              aria-label="Toggle Settings section"
              className={`flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 font-body text-[0.9rem] transition-colors ${
                childActive ? "font-semibold text-white" : "font-normal text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Settings size={18} className={childActive ? "text-[#86efac]" : "text-white/40"} />
              <span className="flex-1 text-left">Settings</span>
              {settingsOpen ? (
                <ChevronDown size={14} className="text-white/40" />
              ) : (
                <ChevronRight size={14} className="text-white/40" />
              )}
            </button>

            {settingsOpen && (
              <div className="mt-0.5 space-y-0.5 pl-6">
                {settingsGroupNav.map((item) => (
                  <SidebarNavItem key={item.to} {...item} compact />
                ))}
              </div>
            )}
          </div>
        </nav>
        <div className="border-t border-white/10 px-3 py-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 font-body text-[0.9rem] text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} className="text-white/40" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-60">
        <header className="sticky top-0 z-30 hidden h-14 items-center justify-end gap-3 border-b border-gray-100 bg-white px-4 shadow-sm lg:flex lg:px-8">
          <NotificationBell />
          <Avatar className="h-9 w-9 border border-green-500">
            <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-white">{initials}</AvatarFallback>
          </Avatar>
        </header>

        <header className="fixed left-0 right-0 top-0 z-50 flex h-15.5 items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm lg:hidden">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <LogoMark size={36} className="drop-shadow-md" />
            <div>
              <div className="font-heading text-base font-bold leading-tight text-green-900">SMARTLOG</div>
              <div className="font-mono text-xs font-medium text-green-700/75">ADMIN PANEL</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-50 hover:text-red-600"
            >
              <LogOut size={18} />
            </button>
            <Avatar className="h-9 w-9 border border-green-500">
              <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-white">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden pt-[calc(3.875rem+env(safe-area-inset-top,0px))] pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] lg:pt-0 lg:pb-8">
          <div className="mx-auto max-w-7xl space-y-4 px-3 pb-6 pt-3 sm:space-y-5 sm:px-4 sm:pb-8 sm:pt-4 lg:px-8">
            {children}
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-[120] border-t border-gray-200 bg-white/95 px-3 py-2 shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}>
          <div className="mx-auto flex max-w-md items-center justify-around gap-1">
            {bottomNav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-13 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-colors ${
                    isActive
                      ? "bg-green-50 text-green-700 ring-1 ring-green-100"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`
                }
              >
                <Icon size={20} />
                <span className="text-[11px] font-semibold">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
