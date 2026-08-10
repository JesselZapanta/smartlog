import { Link } from "react-router-dom";
import {
  Camera,
  NotebookPen,
  FolderUp,
  ClipboardCheck,
  BarChart3,
  Building2,
  ArrowRight,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/Logo.jsx";

const features = [
  {
    icon: Camera,
    title: "Photo-Captured DTR",
    description: "Interns record time-in and time-out with timestamped photo evidence for secure, verifiable attendance.",
  },
  {
    icon: NotebookPen,
    title: "Digital Journals",
    description: "Real-time journal submission with documentation for continuous intern progress monitoring.",
  },
  {
    icon: FolderUp,
    title: "Requirement Submission",
    description: "Online submission and status tracking of pre- and post-deployment OJT documents.",
  },
  {
    icon: ClipboardCheck,
    title: "HTE & Intern Evaluation",
    description: "Standardized digital evaluation forms that reduce courtesy bias and improve objectivity.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Attendance, requirement, and evaluation reports — including Annex C & D and placement reports.",
  },
  {
    icon: Building2,
    title: "HTE Management",
    description: "Centralized partner records and intern assignment monitoring across host training establishments.",
  },
];

const stats = [
  { value: "700+", label: "Interns monitored per year" },
  { value: "20+", label: "Documents tracked per intern" },
  { value: "5", label: "Stakeholder roles" },
  { value: "1", label: "Centralized platform" },
];

const roles = ["OPAO Personnel", "OJT Coordinator", "OJT Instructor", "HTE Supervisor", "Intern"];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <LogoMark size={40} className="drop-shadow-sm" />
            <div>
              <div className="font-heading text-base font-bold leading-tight text-green-900">SMARTLOG</div>
              <div className="font-mono text-[0.65rem] font-medium text-green-700/75">OJT MONITORING SYSTEM</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            <a href="#features" className="hover:text-green-700">Features</a>
            <a href="#roles" className="hover:text-green-700">Who it's for</a>
            <a href="#about" className="hover:text-green-700">About</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden h-11 rounded-xl px-4 text-green-700 hover:bg-green-50 sm:inline-flex">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild className="h-11 rounded-xl bg-green-600 px-4 font-semibold text-white hover:bg-green-700 sm:hidden">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild className="hidden h-11 rounded-xl bg-green-600 px-5 font-semibold text-white hover:bg-green-700 sm:inline-flex">
              <Link to="/login">
                Get Started <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-green-700">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-500/10" />
        <div className="pointer-events-none absolute right-1/3 top-10 h-2 w-2 rounded-full bg-emerald-300/40" />
        <div className="pointer-events-none absolute right-1/4 top-24 h-1.5 w-1.5 rounded-full bg-emerald-300/30" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div className="text-center lg:text-left">
            <Badge variant="outline" className="border-white/20 bg-white/10 font-mono text-[0.7rem] tracking-[0.2em] text-[#86efac]">
              WEB + MOBILE · PHOTO-CAPTURED DTR
            </Badge>
            <h1 className="mt-5 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              Every OJT hour.
              <br />
              <span className="text-[#86efac]">Tracked. Verified. Digital.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-green-100 sm:text-base lg:mx-0">
              SMARTLOG is a cross-platform OJT monitoring and internship management system for Tangub City Global
              College — replacing manual attendance, scattered records, and delayed submissions with one centralized
              platform.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild size="lg" className="h-12 w-full rounded-xl bg-white px-6 font-semibold text-green-700 shadow-sm hover:bg-green-50 sm:w-auto">
                <Link to="/login">
                  Get Started <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-xl border-white/25 bg-white/5 px-6 font-semibold text-white hover:bg-white/10 sm:w-auto">
                <a href="#features">Explore Features</a>
              </Button>
            </div>
          </div>
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <div className="rounded-3xl border border-white/15 bg-white/5 p-3 backdrop-blur-sm sm:p-4">
              <div className="mb-3 flex items-center gap-1.5 px-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <div className="ml-2 min-w-0 flex-1 truncate rounded-md bg-white/10 px-2 py-1 font-mono text-[10px] text-green-100/70">
                  smartlog.tcgc.edu.ph/admin
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex">
                  <div className="hidden w-24 flex-col gap-1 bg-green-950 p-2 sm:flex">
                    <div className="mb-1 flex items-center gap-1.5 rounded-md bg-white/10 px-1.5 py-1">
                      <LogoMark size={14} />
                      <span className="font-heading text-[8px] font-bold tracking-wide text-white">SMARTLOG</span>
                    </div>
                    {[
                      { icon: ClipboardCheck, label: "Dashboard", active: true },
                      { icon: Users, label: "Interns" },
                      { icon: Camera, label: "DTR" },
                      { icon: BarChart3, label: "Reports" },
                    ].map(({ icon: Icon, label, active }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-1 rounded-md px-1.5 py-1 ${
                          active ? "bg-green-600/30" : "bg-transparent"
                        }`}
                      >
                        <Icon size={9} className={active ? "text-[#86efac]" : "text-white/40"} />
                        <span className={`text-[8px] font-medium ${active ? "text-white" : "text-white/60"}`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 bg-gray-50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[8px] font-semibold text-green-600">Good morning</p>
                        <p className="font-heading text-[11px] font-bold text-green-950">Welcome back, Admin</p>
                      </div>
                      <div className="rounded-lg bg-white px-2 py-1 ring-1 ring-green-100">
                        <p className="font-heading text-[11px] font-bold text-green-900">08:42 AM</p>
                        <p className="text-[7px] text-gray-400">Current time</p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-white p-2 shadow-sm">
                        <p className="text-[7px] font-semibold uppercase tracking-wider text-gray-400">Interns</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Users size={10} className="text-green-600" />
                          <p className="font-heading text-sm font-bold text-gray-900">247</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-white p-2 shadow-sm">
                        <p className="text-[7px] font-semibold uppercase tracking-wider text-gray-400">HTEs</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Building2 size={10} className="text-emerald-600" />
                          <p className="font-heading text-sm font-bold text-gray-900">18</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-green-100 bg-green-50 p-2">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-green-600">
                          <Camera size={11} className="text-white" />
                        </span>
                        <div>
                          <p className="text-[8px] font-semibold text-green-900">DTR Verified</p>
                          <p className="font-mono text-[7px] text-green-700/70">2026-08-09 · 08:00 AM</p>
                        </div>
                      </div>
                      <CheckCircle2 size={13} className="text-green-600" />
                    </div>
                    <div className="mt-2 rounded-xl bg-white p-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-[8px] font-semibold text-gray-700">Requirements</p>
                        <p className="font-mono text-[7px] text-gray-400">86%</p>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full w-[86%] rounded-full bg-green-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-heading text-2xl font-bold text-green-700 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-green-600">Features</p>
          <h2 className="mt-3 font-heading text-2xl font-bold text-green-950 sm:text-3xl">
            Everything OJT monitoring needs, in one place
          </h2>
          <p className="mt-3 text-sm text-gray-500 sm:text-base">
            From attendance capture to evaluation and reporting — built for interns, coordinators, instructors, HTEs, and OPAO.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700 ring-1 ring-green-100 transition-colors group-hover:bg-green-600 group-hover:text-white">
                <Icon size={20} />
              </div>
              <h3 className="mt-4 font-heading text-base font-bold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="roles" className="scroll-mt-20 bg-gradient-to-br from-green-50 via-emerald-50 to-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-green-600">Who it's for</p>
            <h2 className="mt-3 font-heading text-2xl font-bold text-green-950 sm:text-3xl">Built for every stakeholder</h2>
            <p className="mt-3 text-sm text-gray-500 sm:text-base">
              Role-based access keeps every actor focused on what matters — with a mobile app for interns in the field.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-green-800 ring-1 ring-green-200 shadow-sm"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-500 px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
          <div className="relative">
            <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">Ready to modernize OJT monitoring?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-green-50 sm:text-base">
              Join Tangub City Global College in moving from manual records to a digital, photo-verified internship platform.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 h-12 rounded-xl bg-white px-7 font-semibold text-green-700 shadow-sm hover:bg-green-50"
            >
              <Link to="/login">
                Sign in to SMARTLOG <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer id="about" className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex items-center gap-2.5">
              <LogoMark size={40} className="drop-shadow-sm" />
              <div className="text-left">
                <div className="font-heading text-base font-bold text-green-900">SMARTLOG</div>
                <div className="font-mono text-[0.65rem] font-medium text-green-700/75">OJT MONITORING SYSTEM</div>
              </div>
            </div>
            <p className="max-w-md text-sm text-gray-500">
              An integrated web and mobile-based OJT monitoring system with photo-captured attendance and records
              tracking for Tangub City Global College.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <a href="#features" className="hover:text-green-700">Features</a>
              <a href="#roles" className="hover:text-green-700">Who it's for</a>
              <Link to="/login" className="hover:text-green-700">Login</Link>
              <Link to="/admin" className="hover:text-green-700">Admin</Link>
            </div>
            <p className="text-xs text-gray-400">Tangub City Global College — OJT Monitoring System</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
