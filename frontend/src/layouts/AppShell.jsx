import { useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Settings, LogOut, UserRound, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { LogoMark } from "@/components/Logo.jsx";

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

export default function AppShell({ children, navItems, bottomNavItems, portalLabel = "SMARTLOG", settingsGroupNav = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const settingsGroupPaths = settingsGroupNav.map((item) => item.to);
  const initials = getInitials(user?.full_name);
  const [settingsOpen, setSettingsOpen] = useState(() =>
    settingsGroupPaths.some((path) => location.pathname.startsWith(path))
  );
  const childActive = settingsGroupPaths.some((path) => location.pathname.startsWith(path));
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function confirmLogout() {
    setLoggingOut(true);
    await logout();
    setLogoutOpen(false);
    setLoggingOut(false);
    toast.success("Logged out", { description: "See you next time!" });
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col bg-green-950 shadow-[2px_0_20px_rgba(0,0,0,0.18)] lg:flex">
        <div className="border-b border-white/10 px-5 py-6">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <LogoMark size={32} className="drop-shadow-md" />
            <div>
              <div className="font-heading text-[0.95rem] font-bold text-white">SMARTLOG</div>
              <div className="font-mono text-[0.68rem] text-[#86efac]">{portalLabel}</div>
            </div>
          </Link>
        </div>
        <nav className="scrollbar-sidebar flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <SidebarNavItem key={item.to} {...item} />
          ))}

          {settingsGroupNav.length > 0 && (
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
          )}
        </nav>
        <div className="border-t border-white/10 px-3 py-4">
          <Link
            to="/profile"
            aria-label="Update profile"
            className={`block rounded-[9px] p-1.5 no-underline transition-colors hover:bg-white/5 ${
              location.pathname === "/profile" ? "bg-[rgba(34,197,94,0.25)]" : ""
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9 shrink-0 border border-green-500">
                {user?.profile_picture && <AvatarImage src={user.profile_picture} alt={initials} />}
                <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{user?.full_name}</span>
                <span className="block truncate text-[0.68rem] text-white/50">{user?.email}</span>
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="mt-1 flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 font-body text-[0.9rem] text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} className="text-white/40" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-60">
        <header className="sticky top-0 z-30 hidden h-14 items-center justify-end gap-3 border-b border-gray-100 bg-white px-4 shadow-sm lg:flex lg:px-8">
          <NotificationBell />
          <Link to="/profile" aria-label="Update profile">
            <Avatar className="h-9 w-9 border border-green-500">
              {user?.profile_picture && <AvatarImage src={user.profile_picture} alt={initials} />}
              <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-white">{initials}</AvatarFallback>
            </Avatar>
          </Link>
        </header>

        <header className="fixed left-0 right-0 top-0 z-50 flex h-15.5 items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm lg:hidden">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <LogoMark size={36} className="drop-shadow-md" />
            <div>
              <div className="font-heading text-base font-bold leading-tight text-green-900">SMARTLOG</div>
              <div className="font-mono text-xs font-medium text-green-700/75">{portalLabel}</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              to="/profile"
              aria-label="Update profile"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-50 hover:text-green-700"
            >
              <UserRound size={18} />
            </Link>
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              aria-label="Logout"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-50 hover:text-red-600"
            >
              <LogOut size={18} />
            </button>
            <Link to="/profile" aria-label="Update profile">
              <Avatar className="h-9 w-9 border border-green-500">
                {user?.profile_picture && <AvatarImage src={user.profile_picture} alt={initials} />}
                <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-white">{initials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden pt-[calc(3.875rem+env(safe-area-inset-top,0px))] pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] lg:pt-0 lg:pb-8">
          <div className="mx-auto max-w-7xl space-y-4 px-3 pb-6 pt-3 sm:space-y-5 sm:px-4 sm:pb-8 sm:pt-4 lg:px-8">
            {children}
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-[120] border-t border-gray-200 bg-white/95 px-3 py-2 shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}>
          <div className="mx-auto flex max-w-md items-center justify-around gap-1">
            {bottomNavItems.map(({ to, label, icon: Icon, end }) => (
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

      <Dialog open={logoutOpen} onOpenChange={(open) => !open && !loggingOut && setLogoutOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>
              You will be signed out of your SMARTLOG session. You can sign back in anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => setLogoutOpen(false)}
              disabled={loggingOut}
            >
              Cancel
            </Button>
            <Button variant="destructive" className="h-11 rounded-xl" disabled={loggingOut} onClick={confirmLogout}>
              {loggingOut ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Logging out…
                </>
              ) : (
                <>
                  <LogOut size={16} /> Log out
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
