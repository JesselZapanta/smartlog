import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, ArrowRight, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LogoBadge } from "@/components/Logo.jsx";
import { useAuth } from "@/contexts/AuthContext";
import { homeByRole } from "@/components/ProtectedRoute.jsx";

const navLinks = [
  { to: "/features", label: "Features" },
  { to: "/who-its-for", label: "Who it's for" },
  { to: "/policy", label: "Policy" },
];

export default function PublicHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const dashboardPath = user ? homeByRole[user.role] || "/" : "/login";

  function isActive(path) {
    return location.pathname === path;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 no-underline">
          <LogoBadge size={44} className="shrink-0 drop-shadow-sm" />
          <div className="min-w-0">
            <div className="font-heading truncate text-base font-bold leading-tight text-green-900">SMARTLOG</div>
            <div className="hidden font-mono text-[0.65rem] font-medium text-green-700/75 sm:block">OJT MONITORING SYSTEM</div>
            <div className="font-mono text-[0.6rem] font-medium text-green-700/75 sm:hidden">OJT SYSTEM</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={isActive(link.to) ? "font-semibold text-green-700" : "hover:text-green-700"}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button asChild className="h-11 rounded-xl bg-green-600 px-5 font-semibold text-white hover:bg-green-700">
              <Link to={dashboardPath}>
                Dashboard <ArrowRight size={16} />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="h-11 rounded-xl px-4 text-green-700 hover:bg-green-50">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="h-11 rounded-xl bg-green-600 px-5 font-semibold text-white hover:bg-green-700">
                <Link to="/login">
                  Get Started <ArrowRight size={16} />
                </Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {user ? (
            <Button asChild size="sm" className="h-9 rounded-xl bg-green-600 px-3.5 text-sm font-semibold text-white hover:bg-green-700">
              <Link to={dashboardPath} className="inline-flex items-center gap-1.5">
                <LayoutDashboard size={14} /> Dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="h-9 rounded-xl bg-green-600 px-3.5 text-sm font-semibold text-white hover:bg-green-700">
              <Link to="/login">Login</Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                <Menu size={18} />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86%] max-w-[340px] bg-white p-0 sm:max-w-sm">
              <SheetHeader className="border-b border-gray-100 p-5 pb-4 text-left">
                <div className="flex items-center gap-2.5">
                  <LogoBadge size={40} className="shrink-0" />
                  <div>
                    <SheetTitle className="font-heading text-sm font-bold leading-tight text-green-900">SMARTLOG</SheetTitle>
                    <p className="font-mono text-[0.6rem] font-medium tracking-wide text-green-700/70">OJT MONITORING SYSTEM</p>
                  </div>
                </div>
              </SheetHeader>

              <nav className="flex flex-col p-3">
                {navLinks.map((link) => (
                  <SheetClose key={link.to} asChild>
                    <Link
                      to={link.to}
                      onClick={() => setOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors ${
                        isActive(link.to)
                          ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                          : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                      }`}
                    >
                      {link.label}
                      <ArrowRight size={14} className={isActive(link.to) ? "text-green-600" : "text-gray-400"} />
                    </Link>
                  </SheetClose>
                ))}
              </nav>

              <div className="mt-auto border-t border-gray-100 p-4">
                {user ? (
                  <SheetClose asChild>
                    <Button asChild className="h-12 w-full rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700">
                      <Link to={dashboardPath} onClick={() => setOpen(false)} className="inline-flex items-center justify-center gap-2">
                        <LayoutDashboard size={16} /> Go to Dashboard
                      </Link>
                    </Button>
                  </SheetClose>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <SheetClose asChild>
                      <Button asChild variant="outline" className="h-12 rounded-xl border-gray-200 font-semibold">
                        <Link to="/login" onClick={() => setOpen(false)} className="inline-flex items-center justify-center">
                          Login
                        </Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild className="h-12 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700">
                        <Link to="/login" onClick={() => setOpen(false)} className="inline-flex items-center justify-center gap-1.5">
                          Get Started <ArrowRight size={14} />
                        </Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild variant="ghost" className="col-span-2 h-11 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                        <Link to="/register" onClick={() => setOpen(false)} className="inline-flex items-center justify-center">
                          Create intern account
                        </Link>
                      </Button>
                    </SheetClose>
                  </div>
                )}
                <p className="mt-3 text-center font-mono text-[10px] tracking-wide text-gray-400">
                  Tangub City Global College
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
