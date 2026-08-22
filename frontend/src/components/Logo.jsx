import { useId } from "react";
import { cn } from "@/lib/utils";

export function LogoMark({ size = 32, variant = "solid", className = "" }) {
  const rawId = useId();
  const gradId = `smartlog-g${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const solid = variant === "solid";
  const stroke = solid ? "#ffffff" : "#16a34a";
  const check = "#15803d";

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {solid && (
        <defs>
          <linearGradient id={gradId} x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#15803d" />
            <stop offset="0.55" stopColor="#16a34a" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
        </defs>
      )}
      <rect x="2" y="2" width="60" height="60" rx="18" fill={solid ? `url(#${gradId})` : "#ffffff"} />
      {solid && (
        <ellipse cx="20" cy="15" rx="16" ry="9" fill="#ffffff" opacity="0.14" transform="rotate(-38 20 15)" />
      )}
      <rect x="21" y="20" width="7" height="7" rx="1.8" fill="#ffffff" stroke={solid ? "none" : "#16a34a"} strokeWidth={solid ? 0 : 2} />
      <rect x="21" y="28.5" width="7" height="7" rx="1.8" fill={check} />
      <path
        d="M22.9 32.2 24.2 33.5 26.7 30.9"
        stroke="#ffffff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="21" y="37" width="7" height="7" rx="1.8" fill="#ffffff" stroke={solid ? "none" : "#16a34a"} strokeWidth={solid ? 0 : 2} />
      <rect x="32.5" y="23.6" width="11.5" height="2.4" rx="1.2" fill="#ffffff" opacity={solid ? 0.95 : 0.9} />
      <rect x="32.5" y="32.1" width="11.5" height="2.4" rx="1.2" fill="#ffffff" opacity={solid ? 0.95 : 0.9} />
      <rect x="32.5" y="40.6" width="11.5" height="2.4" rx="1.2" fill="#ffffff" opacity={solid ? 0.95 : 0.9} />
    </svg>
  );
}

export function LogoBadge({ size = 40, className = "" }) {
  const rawId = useId();
  const gradId = `sl-badge-g${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const markGradId = `sl-badge-mark${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradId} x1="16" y1="16" x2="184" y2="184" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a7f3d0" />
          <stop offset="0.55" stopColor="#6ee7b7" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id={markGradId} x1="52" y1="52" x2="148" y2="148" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#15803d" />
          <stop offset="0.55" stopColor="#16a34a" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1="100"
          y1="26"
          x2="100"
          y2="33"
          stroke={i % 3 === 0 ? "#059669" : "#10b981"}
          opacity={i % 3 === 0 ? 0.55 : 0.28}
          strokeWidth="4"
          strokeLinecap="round"
          transform={`rotate(${i * 30} 100 100)`}
        />
      ))}

      <circle cx="100" cy="100" r="84" fill="none" stroke="#d1fae5" strokeWidth="5" />
      <circle cx="100" cy="100" r="84" fill="none" stroke={`url(#${gradId})`} strokeWidth="5.5" strokeLinecap="round" />

      <circle cx="100" cy="11.5" r="4.5" fill="#6ee7b7" stroke="#ffffff" strokeWidth="2" />

      <g transform="translate(52 52) scale(1.5)">
        <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${markGradId})`} />
        <ellipse cx="20" cy="15" rx="16" ry="9" fill="#ffffff" opacity="0.14" transform="rotate(-38 20 15)" />
        <rect x="21" y="20" width="7" height="7" rx="1.8" fill="#ffffff" />
        <rect x="21" y="28.5" width="7" height="7" rx="1.8" fill="#15803d" />
        <path d="M22.9 32.2 24.2 33.5 26.7 30.9" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="21" y="37" width="7" height="7" rx="1.8" fill="#ffffff" />
        <rect x="32.5" y="23.6" width="11.5" height="2.4" rx="1.2" fill="#ffffff" opacity="0.95" />
        <rect x="32.5" y="32.1" width="11.5" height="2.4" rx="1.2" fill="#ffffff" opacity="0.95" />
        <rect x="32.5" y="40.6" width="11.5" height="2.4" rx="1.2" fill="#ffffff" opacity="0.95" />
      </g>

      <circle cx="163" cy="37" r="17" fill="#ffffff" stroke="#a7f3d0" strokeWidth="3.5" />
      <path
        d="M155.5 37.5l5 5 9.5-10"
        stroke="#16a34a"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({
  size = 40,
  variant = "solid",
  tagline = true,
  className = "",
  markClassName = "",
  headingClassName = "",
  taglineClassName = "",
}) {
  const light = variant === "light";
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} variant={variant} className={markClassName} />
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "font-heading font-bold tracking-tight",
            light ? "text-white" : "text-green-900",
            headingClassName
          )}
          style={{ fontSize: Math.round(size * 0.5) }}
        >
          SMARTLOG
        </span>
        {tagline && (
          <span
            className={cn(
              "mt-0.5 font-mono font-medium",
              light ? "text-emerald-300" : "text-green-700/75",
              taglineClassName
            )}
            style={{ fontSize: Math.max(8, Math.round(size * 0.2)) }}
          >
            OJT MONITORING SYSTEM
          </span>
        )}
      </span>
    </span>
  );
}

export default Logo;
