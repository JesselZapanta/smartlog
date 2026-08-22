import { useId } from "react";
import { Link } from "react-router-dom";
import { Camera, CheckCircle2, NotebookPen, Clock3, ShieldCheck, Smartphone } from "lucide-react";
import { LogoBadge, LogoMark } from "@/components/Logo.jsx";

export default function AuthAnimatedSide() {
  const rawId = useId();
  const gradId = `sl-auth-grad-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-green-700 lg:flex lg:w-[46%] lg:flex-col xl:w-1/2">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:22px_22px]" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-500/10" />
      <div className="pointer-events-none absolute right-[32%] top-10 h-2 w-2 rounded-full bg-emerald-300/40" />
      <div className="pointer-events-none absolute right-1/4 top-24 h-1.5 w-1.5 rounded-full bg-emerald-300/30" />

      <div className="relative flex items-center gap-3 p-10 xl:p-14">
        <Link to="/" aria-label="SMARTLOG — back to landing page" className="flex shrink-0 no-underline">
          <LogoBadge size={48} className="drop-shadow-lg" />
        </Link>
        <div>
          <div className="font-heading text-lg font-bold leading-tight text-white">SMARTLOG</div>
          <div className="font-mono text-[11px] font-medium tracking-widest text-emerald-300">
            OJT MONITORING SYSTEM
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 py-6 xl:px-8">
        <div className="relative flex w-full max-w-md items-center justify-center">
          <div className="pointer-events-none absolute h-72 w-72 rounded-full border border-white/10 sm:h-80 sm:w-80" />
          <div className="pointer-events-none absolute h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl sm:h-72 sm:w-72" />

          <div className="absolute -left-2 top-8 z-20 hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur sl-chip-float md:flex xl:-left-4">
            <Camera size={13} className="text-emerald-300" />
            DTR time-in · 08:02 AM
          </div>
          <div
            className="absolute -right-3 top-1/3 z-20 hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur sl-chip-float md:flex xl:-right-6"
            style={{ animationDelay: "1.4s" }}
          >
            <CheckCircle2 size={13} className="text-emerald-300" />
            Requirement approved
          </div>
          <div
            className="absolute -bottom-2 right-10 z-20 hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur sl-chip-float md:flex xl:right-6"
            style={{ animationDelay: "2.6s" }}
          >
            <NotebookPen size={13} className="text-emerald-300" />
            Journal submitted
          </div>

          <div className="relative z-10 w-full max-w-sm rounded-[2rem] border border-white/15 bg-white/[0.07] px-6 py-9 text-center shadow-2xl backdrop-blur-md sm:px-8 sm:py-10">
            <div className="relative mx-auto flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60">
              <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
                {Array.from({ length: 12 }).map((_, i) => (
                  <line
                    key={i}
                    x1="100"
                    y1="26"
                    x2="100"
                    y2="33"
                    stroke={i % 3 === 0 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    transform={`rotate(${i * 30} 100 100)`}
                  />
                ))}
              </svg>

              <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90">
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#a7f3d0" />
                    <stop offset="55%" stopColor="#6ee7b7" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                <circle
                  className="sl-hour-ring"
                  cx="100"
                  cy="100"
                  r="84"
                  fill="none"
                  stroke={`url(#${gradId})`}
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeDasharray="528"
                />
              </svg>

              <div className="sl-hour-head absolute inset-0">
                <span className="absolute left-1/2 top-[4.5%] h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-emerald-200 shadow-[0_0_16px_4px_rgba(110,231,183,0.6)]" />
              </div>

              <div className="sl-glow absolute h-36 w-36 rounded-full bg-emerald-400/25 blur-2xl sm:h-44 sm:w-44" />

              <div className="sl-float relative">
                <LogoMark className="h-32 w-32 drop-shadow-[0_18px_40px_rgba(16,185,129,0.35)] sm:h-36 sm:w-36" />
                <div className="sl-hour-badge absolute -right-3 -top-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(16,185,129,0.45)] ring-2 ring-emerald-300 sm:h-14 sm:w-14">
                  <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 sm:h-8 sm:w-8">
                    <path
                      className="sl-badge-draw"
                      d="M5 12.5l4.2 4.2L19 7.5"
                      stroke="#16a34a"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-1.5">
              <p className="font-heading text-xl font-bold tracking-tight text-white">SMARTLOG</p>
              <p className="font-mono text-[10px] font-medium tracking-[0.32em] text-emerald-300/90">
                OJT MONITORING SYSTEM
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {[
                { icon: Clock3, label: "Hours tracked" },
                { icon: ShieldCheck, label: "Verified" },
                { icon: Smartphone, label: "Digital" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-green-50 backdrop-blur"
                >
                  <Icon size={12} className="text-emerald-300" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 px-10 py-5 xl:px-14">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-heading text-sm font-bold text-white">Tangub City Global College</div>
            <div className="text-[11px] font-medium text-emerald-200/60">OJT, Placement and Alumni Affairs Office</div>
          </div>
          <div className="hidden text-right text-[11px] text-emerald-200/50 sm:block">SMARTLOG v1</div>
        </div>
      </div>
    </aside>
  );
}
