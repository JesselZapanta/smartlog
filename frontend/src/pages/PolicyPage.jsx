import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Clock3, Building2, Smartphone, FileText, Lock, Scale, Eye, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LogoBadge } from "@/components/Logo.jsx";
import PublicHeader from "@/components/PublicHeader.jsx";

export default function PolicyPage() {
  const [tab, setTab] = useState("terms");
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-green-700">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-500/10" />
        <div className="pointer-events-none absolute right-1/3 top-10 h-2 w-2 rounded-full bg-emerald-300/40" />
        <div className="pointer-events-none absolute right-1/4 top-24 h-1.5 w-1.5 rounded-full bg-emerald-300/30" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:px-8">
          <div className="text-center lg:text-left">
            <Badge variant="outline" className="border-white/20 bg-white/10 font-mono text-[0.65rem] tracking-[0.2em] text-[#86efac]">
              <Scale size={12} className="mr-1.5 inline" /> LEGAL · UPDATED AUG 2026
            </Badge>
            <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.5rem]">
              Terms of Service
              <br />
              <span className="text-[#86efac]">& Privacy Policy</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-green-100 sm:text-[15px] lg:mx-0">
              Your trust matters. This page explains how SMARTLOG handles OJT data, what you agree to by using the platform,
              and how we protect records for Tangub City Global College.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <ShieldCheck size={12} className="text-emerald-300" /> Encrypted & role-guarded
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <Lock size={12} className="text-emerald-300" /> Data stays at TCGC
              </span>
            </div>
          </div>
          <div className="relative mx-auto flex w-full max-w-sm flex-col gap-3 sm:max-w-md">
            <div className="rounded-[1.5rem] border border-white/15 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold tracking-widest text-emerald-200">DOCUMENT</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold tracking-widest text-green-700">TCGC</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { icon: FileText, title: "Terms of Service", desc: "Accounts, use & responsibilities", value: "terms" },
                  { icon: ShieldCheck, title: "Privacy Policy", desc: "Collection, use & your rights", value: "privacy" },
                ].map(({ icon: Icon, title, desc, value }) => {
                  const active = tab === value;
                  return (
                    <button
                      key={title}
                      type="button"
                      onClick={() => setTab(value)}
                      aria-pressed={active}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                        active
                          ? "border-white/20 bg-white text-green-900 shadow-sm"
                          : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-green-600 text-white" : "bg-white/10 text-emerald-200"}`}>
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xs font-bold leading-none ${active ? "text-green-900" : "text-white"}`}>{title}</span>
                        <span className={`mt-0.5 block text-[11px] ${active ? "text-gray-500" : "text-emerald-100/70"}`}>{desc}</span>
                      </span>
                      {active && <CheckCircle2 size={16} className="shrink-0 text-green-600" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs text-gray-600 shadow-sm">
                <Mail size={14} className="text-green-600" /> Questions? <span className="font-semibold text-green-700">opao@tcgc.edu.ph</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="sticky top-[65px] z-20 -mx-4 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-3">
            <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-gray-100 p-1 sm:inline-flex sm:w-auto">
              <TabsTrigger value="terms" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <FileText size={14} className="mr-1.5" /> Terms of Service
              </TabsTrigger>
              <TabsTrigger value="privacy" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Lock size={14} className="mr-1.5" /> Privacy Policy
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="terms" className="mt-6">
            <div className="rounded-[1.5rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 font-mono text-[0.65rem] tracking-widest">TERMS</Badge>
              </div>
              <h2 className="mt-3 font-heading text-xl font-bold text-green-950">Terms of Service</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                By creating an account or using SMARTLOG you agree to these terms. If you are an intern, HTE, instructor, or
                coordinator, you also agree to TCGC academic policies.
              </p>

              <div className="mt-6 space-y-6">
                {[
                  {
                    n: "01",
                    t: "Eligibility & accounts",
                    d: "Accounts are for TCGC OJT participants only. You must provide accurate name, email, and COR; keep your password confidential; and verify email via OTP. One account per person. Impersonation or sharing credentials is prohibited.",
                  },
                  {
                    n: "02",
                    t: "Your responsibilities",
                    d: "Submit true, timely data: photo-captured DTR must be your own face at your HTE; journals must reflect actual work; requirements must be legible PDFs/images. Coordinators and HTEs must review in good faith.",
                  },
                  {
                    n: "03",
                    t: "Acceptable use",
                    d: "No scraping, reverse engineering, or attempting to bypass role guards or photo verification. No upload of malware, infringing, or harassing content. We may log IP, device, and audit trails for security.",
                  },
                  {
                    n: "04",
                    t: "HTE & evaluation integrity",
                    d: "Evaluations use a 1–4 scale (NA allowed). Submitting false evaluations or colluding to inflate scores may result in academic sanctions. Coordinators may invalidate suspect records.",
                  },
                  {
                    n: "05",
                    t: "Intellectual property",
                    d: "TCGC retains rights to academic records. You grant TCGC a license to store and display your submissions for OJT administration and accreditation.",
                  },
                  {
                    n: "06",
                    t: "Availability & changes",
                    d: "SMARTLOG is provided as-is. We strive for 24/7 uptime but may suspend for maintenance. Terms may change with notice on this page; continued use after update is acceptance.",
                  },
                  {
                    n: "07",
                    t: "Termination",
                    d: "Violation may lead to account suspension and referral to the Office of Practicum & Alumni Affairs. Upon graduation/completion, accounts become read-only per retention policy.",
                  },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-mono text-xs font-bold text-green-700 ring-1 ring-gray-200">
                      {s.n}
                    </span>
                    <div>
                      <h3 className="font-heading text-sm font-bold text-gray-900">{s.t}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-500">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <Sparkles size={14} /> Need help?
                </p>
                <p className="mt-1 text-sm text-amber-800/80">
                  Contact your OJT Coordinator or email <span className="font-semibold">opao@tcgc.edu.ph</span> for appeals, corrections, or questions about these terms.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <div className="rounded-[1.5rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 font-mono text-[0.65rem] tracking-widest">PRIVACY</Badge>
              </div>
              <h2 className="mt-3 font-heading text-xl font-bold text-green-950">Privacy Policy</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                SMARTLOG handles OJT records for Tangub City Global College. This policy explains what we collect, why, and how
                you can control it.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Eye, title: "What we collect", desc: "Name, contact, program/institute, DTR photos & timestamps, journals, requirements (PDF), evaluations, login metadata." },
                  { icon: Building2, title: "Why we collect", desc: "To verify attendance, monitor progress, evaluate interns, and generate Annex C/D and placement reports for TCGC." },
                  { icon: Lock, title: "Legal basis", desc: "Your consent at registration + TCGC academic administration. You may withdraw by requesting account deletion (unless retention required)." },
                  { icon: ShieldCheck, title: "Who can see it", desc: "Intern: own records only. HTE/Instructor: assigned interns only. Coordinator/OPAO: all. No public sharing." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-green-700 ring-1 ring-gray-200">
                      <Icon size={16} />
                    </div>
                    <h3 className="mt-3 font-heading text-sm font-bold text-gray-900">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-gray-900">
                    <Clock3 size={14} className="text-green-600" /> Retention
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    Retained per academic year and archived per TCGC guidelines. Graduated/completed interns become read-only.
                    Deletion on request unless academic record-keeping requires retention.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-gray-900">
                    <Smartphone size={14} className="text-green-600" /> Security & your rights
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    Data encrypted in transit/at rest, role-guarded endpoints, JWT auth, and audit logs. You may request
                    access, correction, or deletion via your Coordinator or <span className="font-semibold text-green-700">opao@tcgc.edu.ph</span>. Photo DTRs are not used for facial recognition beyond manual verification.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-gray-900">
                    <FileText size={14} className="text-green-600" /> Cookies & contact
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    We use essential cookies/localStorage for auth tokens and preferences only. No advertising trackers. For
                    privacy questions or Data Protection Officer contact, reach the OPAO, Tangub City Global College.
                  </p>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-gray-400">
                By using SMARTLOG you consent to this policy. Material changes will be posted here with a new “Last updated” date.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>

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
              <Link to="/features" className="hover:text-green-700">Features</Link>
              <Link to="/who-its-for" className="hover:text-green-700">Who it&apos;s for</Link>
              <Link to="/policy" className="font-semibold text-green-700">Policy</Link>
              <Link to="/login" className="hover:text-green-700">Login</Link>
            </div>
            <p className="text-xs text-gray-400">Tangub City Global College — OJT Monitoring System</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
