import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  GraduationCap,
  Building2,
  User,
  Eye,
  FileCheck,
  CheckCircle2,
  Clock3,
  NotebookPen,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoBadge } from "@/components/Logo.jsx";
import PublicHeader from "@/components/PublicHeader.jsx";

const roles = [
  {
    icon: ShieldCheck,
    title: "OPAO Personnel",
    subtitle: "Admin · Full access",
    desc: "Owns the platform. Creates academic years, institutes, programs, users, and oversees everything.",
    bullets: ["Manage terms & OJT hours", "Create / audit users", "View all reports & documents"],
    accent: "from-green-600 to-emerald-600",
    ring: "ring-green-200",
  },
  {
    icon: Users,
    title: "OJT Coordinator",
    subtitle: "Coordinator · TCGC",
    desc: "Day-to-day owner of deployments, requirements, and evaluations. Bridges interns and HTEs.",
    bullets: ["Approve registrations & COR", "Track requirements & evaluations", "Assign interns to HTEs"],
    accent: "from-emerald-500 to-teal-500",
    ring: "ring-emerald-200",
  },
  {
    icon: GraduationCap,
    title: "OJT Instructor",
    subtitle: "Instructor · Adviser",
    desc: "Monitors assigned interns’ DTR, journals, and progress. Verifies hours and flags issues.",
    bullets: ["Calendar & day monitoring", "Verify / flag DTR & journals", "Hours-completed oversight"],
    accent: "from-teal-500 to-green-500",
    ring: "ring-teal-200",
  },
  {
    icon: Building2,
    title: "HTE Supervisor",
    subtitle: "Host Training Establishment",
    desc: "Supervises deployed interns on-site. Evaluates performance and confirms attendance.",
    bullets: ["View assigned interns", "Monitor DTR & journals", "Evaluate intern (4-point scale)"],
    accent: "from-green-500 to-emerald-600",
    ring: "ring-green-200",
  },
  {
    icon: User,
    title: "Intern",
    subtitle: "Student · BSIT / etc.",
    desc: "The actor in the field. Captures attendance, submits journals and requirements, and tracks completion.",
    bullets: ["Photo-captured DTR", "Daily journals & requirements", "View hours & evaluations"],
    accent: "from-emerald-600 to-green-600",
    ring: "ring-emerald-200",
  },
];

export default function WhoItsForPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-green-700">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-500/10" />
        <div className="pointer-events-none absolute right-1/3 top-10 h-2 w-2 rounded-full bg-emerald-300/40" />
        <div className="pointer-events-none absolute right-1/4 top-20 h-1.5 w-1.5 rounded-full bg-emerald-300/30" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="text-center lg:text-left">
            <Badge variant="outline" className="border-white/20 bg-white/10 font-mono text-[0.65rem] tracking-[0.2em] text-[#86efac]">
              <Users size={12} className="mr-1.5 inline" /> TCGC · OJT, PLACEMENT & ALUMNI AFFAIRS OFFICE
            </Badge>
            <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.5rem]">
              Built for <span className="text-[#86efac]">TCGC.</span>
              <br />
              <span className="text-white">Built for OJT.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-green-100 sm:text-[15px] lg:mx-0">
              Exclusively for <span className="font-semibold text-white">Tangub City Global College</span> — owned by the
              <span className="font-semibold text-white"> OJT, Placement and Alumni Affairs Office</span>. One platform,
              five lenses. Each role sees only what matters.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <Eye size={12} className="text-emerald-300" /> See only assigned
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <FileCheck size={12} className="text-emerald-300" /> Audit-trailed
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <Smartphone size={12} className="text-emerald-300" /> Mobile for interns
              </span>
            </div>
          </div>
          <div className="relative mx-auto flex w-full max-w-sm flex-col items-center gap-4 sm:max-w-md">
            <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-xl" />
            <div className="relative flex w-full flex-col items-center rounded-[1.75rem] border border-white/15 bg-white p-6 shadow-2xl sm:p-7">
              <img
                src="/tcgc-logo.png"
                alt="Tangub City Global College seal — 1984, Integrity Compassion Excellence, Lux Mundi"
                className="h-36 w-36 object-contain drop-shadow-sm sm:h-44 sm:w-44"
                loading="eager"
              />
              <div className="mt-4 text-center">
                <p className="font-heading text-sm font-bold leading-tight text-green-900">TANGUB CITY GLOBAL COLLEGE</p>
                <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-green-700">1984 · LUX MUNDI</p>
                <div className="mx-auto mt-2 flex items-center justify-center gap-1.5 rounded-full bg-green-50 px-3 py-1 ring-1 ring-green-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                  <span className="font-mono text-[10px] font-bold tracking-widest text-green-700">OJT, PLACEMENT & ALUMNI AFFAIRS OFFICE</span>
                </div>
                <p className="mt-2 text-[11px] font-medium tracking-widest text-green-700/60">INTEGRITY · COMPASSION · EXCELLENCE</p>
              </div>
            </div>
            <p className="text-center font-mono text-[10px] leading-relaxed tracking-wide text-emerald-200/70">
              Official OJT monitoring system of TCGC — Tangub City Global College
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50/60 px-5 py-4 sm:flex-row sm:px-6">
            <div className="flex items-center gap-3">
              <img src="/tcgc-logo.png" alt="TCGC seal small" className="h-10 w-10 object-contain sm:h-11 sm:w-11" />
              <div className="text-left">
                <p className="font-heading text-sm font-bold leading-tight text-gray-900">Tangub City Global College</p>
                <p className="font-mono text-xs font-medium text-green-700">OJT, Placement and Alumni Affairs Office</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-white px-3 py-1.5 font-medium text-gray-600 ring-1 ring-gray-200">Est. 1984</span>
              <span className="rounded-full bg-green-600 px-3 py-1.5 font-semibold text-white shadow-sm">Lux Mundi</span>
              <span className="rounded-full bg-white px-3 py-1.5 font-medium text-gray-600 ring-1 ring-gray-200">Tangub City, Misamis Occidental</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="border-green-200 bg-green-50 font-mono text-[0.65rem] tracking-[0.2em] text-green-700">ROLES</Badge>
          <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-green-950 sm:text-3xl">Five roles. One truth. For TCGC.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-500">
            Scoped by design for the OJT, Placement and Alumni Affairs Office — you only see what your role needs. No noise, no
            cross-tenant leaks.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {roles.map(({ icon: Icon, title, subtitle, desc, bullets, accent, ring }) => (
            <div
              key={title}
              className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5"
            >
              <div className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-xl transition-opacity group-hover:opacity-15`} />
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm ring-1 ${ring}`}>
                <Icon size={18} />
              </div>
              <h3 className="mt-3 font-heading text-[14px] font-bold leading-tight text-gray-900">{title}</h3>
              <p className="font-mono text-[10px] font-semibold tracking-widest text-green-600">{subtitle}</p>
              <p className="mt-2 min-h-[3rem] text-xs leading-relaxed text-gray-500">{desc}</p>
              <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-1.5 text-[11px] leading-snug text-gray-600">
                    <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-green-600" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-gray-100 bg-gray-50/60">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-600 font-mono text-[0.65rem] tracking-widest text-white hover:bg-green-700">HOW IT FLOWS AT TCGC</Badge>
              <span className="text-xs font-medium text-gray-500">Intern → HTE → Instructor → Coordinator → OPAO</span>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-5">
              {[
                { step: "01", t: "Register & verify", d: "Intern creates account, uploads COR, verifies email." },
                { step: "02", t: "Get deployed", d: "Coordinator assigns to HTE; clock starts." },
                { step: "03", t: "Track daily", d: "Photo DTR + journal; HTE/Instructor verifies." },
                { step: "04", t: "Submit docs", d: "Requirements flow: submitted → checked → completed." },
                { step: "05", t: "Close out", d: "Evaluations + hours-completed + reports." },
              ].map((s) => (
                <div key={s.step} className="relative rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                  <p className="font-mono text-[10px] font-bold tracking-widest text-green-600">{s.step}</p>
                  <p className="mt-1 font-heading text-xs font-bold leading-tight text-gray-900">{s.t}</p>
                  <p className="mt-1 text-[11px] leading-snug text-gray-500">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="h-10 rounded-xl bg-green-600 px-5 font-semibold text-white hover:bg-green-700">
                <Link to="/features">Explore features</Link>
              </Button>
              <Button asChild variant="outline" className="h-10 rounded-xl">
                <Link to="/policy">Read policy</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex gap-4">
              <img src="/tcgc-logo.png" alt="TCGC" className="hidden h-14 w-14 shrink-0 rounded-full bg-white p-1.5 shadow-sm sm:flex" />
              <div className="max-w-xl">
                <h3 className="font-heading text-xl font-bold text-white sm:text-2xl">The official OJT system of TCGC.</h3>
                <p className="mt-1 text-sm leading-relaxed text-green-50 sm:text-[15px]">
                  Managed by the OJT, Placement and Alumni Affairs Office — Tangub City Global College, J. Luna St., Maloro,
                  Tangub City, 7214.
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-green-50">
                  <Clock3 size={14} className="text-emerald-100" /> Demo accounts available •{" "}
                  <NotebookPen size={14} className="text-emerald-100" /> Mobile for interns
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" className="h-11 rounded-xl bg-white px-6 font-semibold text-green-700 hover:bg-green-50">
                <Link to="/login">Go to login</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 rounded-xl border-white/30 bg-white/5 px-6 font-semibold text-white hover:bg-white/10">
                <Link to="/register">Create account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2.5">
              <img src="/tcgc-logo.png" alt="TCGC seal" className="h-9 w-9 object-contain" />
              <LogoBadge size={36} className="drop-shadow-sm" />
              <div className="text-left">
                <div className="font-heading text-sm font-bold text-green-900">SMARTLOG</div>
                <div className="font-mono text-[0.6rem] font-medium text-green-700/75">OJT MONITORING SYSTEM</div>
                <div className="font-mono text-[0.55rem] font-medium tracking-wide text-green-600">OJT, Placement and Alumni Affairs Office · TCGC</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <Link to="/features" className="hover:text-green-700">Features</Link>
              <Link to="/who-its-for" className="font-semibold text-green-700">Who it&apos;s for</Link>
              <Link to="/policy" className="hover:text-green-700">Policy</Link>
              <Link to="/login" className="hover:text-green-700">Login</Link>
            </div>
            <p className="text-xs text-gray-400">Tangub City Global College — OJT, Placement and Alumni Affairs Office · J. Luna St., Maloro, Tangub City</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
