import { useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Settings, LogOut, Loader2, ChevronDown, ChevronRight, Ellipsis } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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
import { LogoBadge } from "@/components/Logo.jsx";

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

export default function AppShell({ children, navItems, bottomNavItems, portalLabel = "SMARTLOG", settingsGroupNav = [], navGroups = [], footerNavItems = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const settingsGroupPaths = settingsGroupNav.map((item) => item.to);
  const allGroupItems = navGroups.flatMap((group) => group.items);
  const initials = getInitials(user?.full_name);
  const [settingsOpen, setSettingsOpen] = useState(() =>
    settingsGroupPaths.some((path) => location.pathname.startsWith(path))
  );
  const childActive = settingsGroupPaths.some((path) => location.pathname.startsWith(path));
  const [groupOpen, setGroupOpen] = useState(() => {
    const initial = {};
    navGroups.forEach((group) => {
      initial[group.label] = group.items.some((item) => location.pathname.startsWith(item.to));
    });
    return initial;
  });
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryBottomNav = bottomNavItems.slice(0, 4);
  const flatMoreItems = navItems.filter((item) => !primaryBottomNav.some((p) => p.to === item.to));
  const groupMoreItems = allGroupItems.filter((item) => !primaryBottomNav.some((p) => p.to === item.to));
  const settingsMoreItems = settingsGroupNav.filter((item) => !primaryBottomNav.some((p) => p.to === item.to));
  const footerMoreItems = footerNavItems.filter((item) => !primaryBottomNav.some((p) => p.to === item.to));
const moreNavItems = [...flatMoreItems, ...groupMoreItems, ...settingsMoreItems, ...footerMoreItems];
const hasMore = true;
const moreActive = moreNavItems.some((item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/"));

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
          <Link to="/" aria-label="SMARTLOG — back to landing page" className="flex items-center gap-2.5 no-underline">
            <LogoBadge size={38} className="drop-shadow-md" />
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

          {navGroups.map((group) => {
            const isOpen = groupOpen[group.label] ?? false;
            const isChildActive = group.items.some((item) => location.pathname.startsWith(item.to));
            const GroupIcon = group.icon;
            return (
              <div key={group.label} className="pt-2">
                <button
                  type="button"
                  onClick={() => setGroupOpen((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
                  aria-expanded={isOpen}
                  aria-label={`Toggle ${group.label} section`}
                  className={`flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 font-body text-[0.9rem] transition-colors ${
                    isChildActive ? "font-semibold text-white" : "font-normal text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <GroupIcon size={18} className={isChildActive ? "text-[#86efac]" : "text-white/40"} />
                  <span className="flex-1 text-left">{group.label}</span>
                  {isOpen ? (
                    <ChevronDown size={14} className="text-white/40" />
                  ) : (
                    <ChevronRight size={14} className="text-white/40" />
                  )}
                </button>

                {isOpen && (
                  <div className="mt-0.5 space-y-0.5 pl-6">
                    {group.items.map((item) => (
                      <SidebarNavItem key={item.to} {...item} compact />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

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

          {footerNavItems.length > 0 && (
            <div className="mt-2 space-y-0.5 border-t border-white/10 pt-2">
              {footerNavItems.map((item) => (
                <SidebarNavItem key={item.to} {...item} />
              ))}
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
          <Link to="/" aria-label="SMARTLOG — back to landing page" className="flex items-center gap-2 no-underline">
            <LogoBadge size={42} className="drop-shadow-md" />
            <div>
              <div className="font-heading text-base font-bold leading-tight text-green-900">SMARTLOG</div>
              <div className="font-mono text-xs font-medium text-green-700/75">{portalLabel}</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden pt-[calc(3.875rem+env(safe-area-inset-top,0px))] pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] lg:pt-0 lg:pb-8">
          <div className="mx-auto max-w-7xl space-y-4 px-3 pb-6 pt-3 sm:space-y-5 sm:px-4 sm:pb-8 sm:pt-4 lg:px-8">
            {children}
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 px-3 py-2 shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}>
          <div className="mx-auto flex max-w-md items-center justify-around gap-1">
            {primaryBottomNav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-13 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center transition-colors ${
                    isActive
                      ? "bg-green-50 text-green-700 ring-1 ring-green-100"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`
                }
              >
                <Icon size={20} className="shrink-0" />
                <span className="line-clamp-2 break-words text-center text-[11px] font-semibold leading-tight">{label}</span>
              </NavLink>
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={`flex min-h-13 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center transition-colors ${moreActive ? "bg-green-50 text-green-700 ring-1 ring-green-100" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
                aria-label="More navigation"
              >
                <Ellipsis size={20} className="shrink-0" />
                <span className="line-clamp-2 break-words text-center text-[11px] font-semibold leading-tight">More</span>
              </button>
            )}
          </div>
        </nav>

        <Drawer open={moreOpen} onOpenChange={setMoreOpen} direction="bottom">
          <DrawerContent className="px-4 pb-6 pt-2">
            <DrawerHeader className="pb-2 pt-2">
              <DrawerTitle className="text-left text-base">More</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-3 overflow-y-auto px-1 pb-2">
              {flatMoreItems.length > 0 && (
                <div className="space-y-1">
                  {flatMoreItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${isActive ? "bg-green-50 text-green-700 ring-1 ring-green-100" : "text-gray-700 hover:bg-gray-50"}`
                      }
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500 ring-1 ring-gray-100">
                        <Icon size={18} />
                      </span>
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
              {navGroups.map((group) => {
                const visibleItems = group.items.filter((item) => groupMoreItems.some((m) => m.to === item.to));
                if (visibleItems.length === 0) return null;
                return (
                  <div key={group.label} className="space-y-1 border-t border-gray-100 pt-3">
                    <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">{group.label}</p>
                    {visibleItems.map(({ to, label, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setMoreOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${isActive ? "bg-green-50 text-green-700 ring-1 ring-green-100" : "text-gray-700 hover:bg-gray-50"}`
                        }
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500 ring-1 ring-gray-100">
                          <Icon size={18} />
                        </span>
                        {label}
                      </NavLink>
                    ))}
                  </div>
                );
              })}
              {settingsMoreItems.length > 0 && (
                <div className="space-y-1 border-t border-gray-100 pt-3">
                  <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Settings</p>
                  {settingsMoreItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${isActive ? "bg-green-50 text-green-700 ring-1 ring-green-100" : "text-gray-700 hover:bg-gray-50"}`
                      }
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500 ring-1 ring-gray-100">
                        <Icon size={18} />
                      </span>
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-2 border-t border-gray-100 px-1 pt-4">
              <Link
                to="/profile"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-gray-50"
              >
                <Avatar className="h-9 w-9 shrink-0 border border-green-500">
                  {user?.profile_picture && <AvatarImage src={user.profile_picture} alt={initials} />}
                  <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">{user?.full_name}</span>
                  <span className="block truncate text-xs text-gray-500">{user?.email}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  setLogoutOpen(true);
                }}
                className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 ring-1 ring-red-100">
                  <LogOut size={16} />
                </span>
                Sign out
              </button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <Dialog open={logoutOpen} onOpenChange={(open) => !open && !loggingOut && setLogoutOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>
              You will be signed out of your SMARTLOG session. You can sign back in anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-xl sm:flex-initial"
              onClick={() => setLogoutOpen(false)}
              disabled={loggingOut}
            >
              Cancel
            </Button>
            <Button variant="destructive" className="h-11 flex-1 rounded-xl sm:flex-initial" disabled={loggingOut} onClick={confirmLogout}>
              {loggingOut ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Logging out...
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
