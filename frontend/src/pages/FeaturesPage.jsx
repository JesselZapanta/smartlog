import { Link } from "react-router-dom";
import {
  Camera,
  NotebookPen,
  FolderUp,
  ClipboardCheck,
  BarChart3,
  Building2,
  ArrowRight,
  ShieldCheck,
  Clock3,
  Sparkles,
  CheckCircle2,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoBadge, LogoMark } from "@/components/Logo.jsx";
import PublicHeader from "@/components/PublicHeader.jsx";

const features = [
  {
    icon: Camera,
    tag: "ATTENDANCE",
    title: "Photo-Captured DTR",
    desc: "Timestamped photo proof for every time-in/out. GPS-ready, tamper-resistant, and instantly verifiable by coordinators.",
    bullets: ["Front-camera capture", "AM/PM auto grouping", "Checked / Pending / Verified flow"],
    accent: "from-emerald-500 to-teal-500",
  },
  {
    icon: NotebookPen,
    tag: "JOURNAL",
    title: "Digital Journals",
    desc: "Daily narratives + photo evidence. Calendar view, DTR-linked validation, and HTE/instructor review.",
    bullets: ["Date-locked to DTR", "Rich text + images", "Instructor flag / verify"],
    accent: "from-green-500 to-emerald-500",
  },
  {
    icon: FolderUp,
    tag: "REQUIREMENTS",
    title: "Requirement Submission",
    desc: "Pre- and post-deployment docs in one place. Status-tracked, versioned, and notifiable on approve/reject.",
    bullets: ["PDF/image uploads", "Submitted → Checked → Completed", "Coordinator bulk actions"],
    accent: "from-teal-500 to-green-600",
  },
  {
    icon: ClipboardCheck,
    tag: "EVALUATION",
    title: "HTE & Intern Evaluation",
    desc: "Bias-reduced digital forms with weighted 1-4 scale. Auto-computed category averages and print-ready reports.",
    bullets: ["Criteria per institute", "NA handling", "Accurate pending logic"],
    accent: "from-emerald-600 to-green-600",
  },
  {
    icon: BarChart3,
    tag: "REPORTS",
    title: "Reports & Analytics",
    desc: "One-click DTR print (8.5x11, continues to next page), Annex C/D, placement and hours-completed reports.",
    bullets: ["Hours → minutes math", "Signature blocks", "Year / HTE filters"],
    accent: "from-green-600 to-teal-600",
  },
  {
    icon: Building2,
    tag: "HTE",
    title: "HTE Management",
    desc: "Partner directory, OJT-hour per institute, assignment board, and live intern counts per HTE.",
    bullets: ["Search / year filter", "Assign / unassign intern", "Deployed vs completed"],
    accent: "from-teal-600 to-emerald-600",
  },
];

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-green-700">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-500/10" />
        <div className="pointer-events-none absolute right-1/3 top-10 h-2 w-2 rounded-full bg-emerald-300/40" />
        <div className="pointer-events-none absolute right-1/4 top-24 h-1.5 w-1.5 rounded-full bg-emerald-300/30" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:px-8 lg:py-12">
          <div className="text-center lg:text-left">
            <Badge variant="outline" className="border-white/20 bg-white/10 font-mono text-[0.65rem] tracking-[0.2em] text-[#86efac]">
              <Sparkles size={12} className="mr-1.5 inline" /> 6 CORE MODULES · WEB + MOBILE
            </Badge>
            <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.6rem]">
              Everything OJT needs.
              <br />
              <span className="text-[#86efac]">Nothing it doesn&apos;t.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-green-100 sm:text-[15px] lg:mx-0">
              From first photo-captured time-in to final HTE evaluation — SMARTLOG centralizes attendance, journals,
              requirements, and reports for 700+ interns a year.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <Clock3 size={12} className="text-emerald-300" /> Photo-verified hours
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <ShieldCheck size={12} className="text-emerald-300" /> Role-guarded data
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <Smartphone size={12} className="text-emerald-300" /> Works on mobile
              </span>
            </div>
            <div className="mt-8 flex flex-row items-center justify-center gap-2 lg:justify-start">
              <Button asChild size="lg" className="h-11 rounded-xl bg-white px-4 font-semibold text-green-700 hover:bg-green-50 sm:px-6">
                <Link to="/register">
                  Create intern account <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11 rounded-xl border-white/20 bg-white/5 px-4 text-white hover:bg-white/10 sm:px-6">
                <Link to="/who-its-for">See who it&apos;s for</Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto flex w-full max-w-sm items-center justify-center lg:max-w-md">
            <div className="pointer-events-none absolute h-64 w-64 rounded-full border border-white/10 sm:h-72 sm:w-72" />
            <div className="pointer-events-none absolute h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl sm:h-56 sm:w-56" />
            <div className="relative z-10 w-full rounded-[1.75rem] border border-white/15 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold tracking-widest text-emerald-200">FEATURE MAP</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold tracking-widest text-green-700">SMARTLOG</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {features.slice(0, 6).map(({ icon: Icon, title }) => (
                  <div key={title} className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-green-700 shadow-sm">
                      <Icon size={16} />
                    </span>
                    <span className="text-[10px] font-semibold leading-tight text-white">{title.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                  <LogoMark className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-semibold leading-none text-white">DTR verified · 08:02 AM</p>
                  <p className="text-[10px] text-emerald-100/70">Photo + GPS · Intern: Juan Dela Cruz</p>
                </div>
                <CheckCircle2 size={16} className="shrink-0 text-emerald-300" />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-emerald-300 to-green-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="border-green-200 bg-green-50 font-mono text-[0.65rem] tracking-[0.2em] text-green-700">FEATURES</Badge>
          <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-green-950 sm:text-3xl">Six modules. One flow.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-500">
            Each card is a standalone workflow — but together they close the loop from deployment to completion and reporting.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc, bullets, tag, accent }) => (
            <div
              key={title}
              className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-200 hover:shadow-lg"
            >
              <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${accent} opacity-[0.08] blur-2xl transition-opacity group-hover:opacity-15`} />
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-gray-50 px-2.5 py-1 font-mono text-[10px] font-bold tracking-widest text-gray-500 ring-1 ring-gray-200">{tag}</span>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm ring-1 ring-white`}>
                  <Icon size={18} />
                </span>
              </div>
              <h3 className="mt-4 font-heading text-[15px] font-bold leading-tight text-gray-900">{title}</h3>
              <p className="mt-2 min-h-[3.25rem] text-[13px] leading-relaxed text-gray-500">{desc}</p>
              <ul className="mt-4 space-y-1.5">
                {bullets.map((b) => (
                  <li key={b} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <CheckCircle2 size={13} className="shrink-0 text-green-600" /> {b}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-green-700 opacity-0 transition-opacity group-hover:opacity-100">
                Explore <ArrowRight size={12} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-gray-100 bg-gray-50/60">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            { k: "700+", l: "Interns monitored / year", d: "Across all institutes at TCGC" },
            { k: "20+", l: "Documents per intern", d: "Pre, during & post deployment" },
            { k: "5", l: "Stakeholder roles", d: "One platform, scoped access" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm sm:p-6">
              <p className="font-heading text-2xl font-bold text-green-700">{s.k}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{s.l}</p>
              <p className="mt-1 text-xs text-gray-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h3 className="font-heading text-xl font-bold text-white sm:text-2xl">Ready to see it in action?</h3>
              <p className="mt-2 text-sm leading-relaxed text-green-50 sm:text-[15px]">
                Create an intern account in 2 minutes or sign in with a demo role. No setup — we assign you to the active academic year.
              </p>
            </div>
            <div className="flex w-full flex-row gap-2 sm:w-auto">
              <Button asChild size="lg" className="h-11 flex-1 rounded-xl bg-white px-4 font-semibold text-green-700 hover:bg-green-50 sm:flex-initial sm:px-6">
                <Link to="/register">Create account</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 flex-1 rounded-xl border-white/30 bg-white/5 px-4 font-semibold text-white hover:bg-white/10 sm:flex-initial sm:px-6">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2.5">
              <LogoBadge size={36} className="drop-shadow-sm" />
              <div className="text-left">
                <div className="font-heading text-sm font-bold text-green-900">SMARTLOG</div>
                <div className="font-mono text-[0.6rem] font-medium text-green-700/75">OJT MONITORING SYSTEM</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <Link to="/features" className="font-semibold text-green-700">Features</Link>
              <Link to="/who-its-for" className="hover:text-green-700">Who it&apos;s for</Link>
              <Link to="/policy" className="hover:text-green-700">Policy</Link>
              <Link to="/login" className="hover:text-green-700">Login</Link>
            </div>
            <p className="text-xs text-gray-400">Tangub City Global College — OJT Monitoring System</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
