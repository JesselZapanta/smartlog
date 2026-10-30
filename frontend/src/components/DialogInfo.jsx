import { Clock3, Info } from "lucide-react";

/**
 * Small labelled value tile used inside confirmation dialogs.
 *
 * Extracted from CoordinatorInternRequirementsDetailPage so every dialog in the
 * system presents intern facts the same way instead of each page improvising its
 * own key/value rows.
 */
export function DialogInfo({ icon: Icon, label, value, iconClassName }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-gray-100 bg-gray-50/60 p-2.5">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-green-50 ring-1 ring-green-100 ${
          iconClassName || "text-green-600"
        }`}
      >
        <Icon size={12} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="break-words text-xs font-semibold text-gray-800">{value || "—"}</p>
      </div>
    </div>
  );
}

/**
 * Green banner showing a single headline figure, e.g. total checked hours.
 */
export function DialogBanner({ icon: Icon = Clock3, label, hint, value, tone = "green" }) {
  const tones = {
    green: {
      wrap: "border-green-100 bg-green-50/60",
      chip: "bg-green-100 text-green-700 ring-green-100",
      label: "text-green-700",
      hint: "text-green-600/80",
      value: "text-green-800",
    },
    amber: {
      wrap: "border-amber-100 bg-amber-50/60",
      chip: "bg-amber-100 text-amber-700 ring-amber-100",
      label: "text-amber-700",
      hint: "text-amber-600/80",
      value: "text-amber-800",
    },
  };
  const t = tones[tone] || tones.green;

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${t.wrap}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${t.chip}`}>
          <Icon size={12} />
        </span>
        <div className="min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${t.label}`}>{label}</p>
          {hint && <p className={`text-[10px] ${t.hint}`}>{hint}</p>}
        </div>
      </div>
      {value && <p className={`shrink-0 font-heading text-sm font-bold ${t.value}`}>{value}</p>}
    </div>
  );
}

/**
 * "What happens after" panel explaining the consequences of a confirmation.
 *
 * `items` is an array of { icon, text } — pass CheckCircle2 for outcomes,
 * Lock for restrictions, Info for neutral notes. Icons are supplied by the
 * caller so this module stays free of icon imports.
 */
export function DialogOutcome({ title = "What happens after", items, tone = "amber", defaultIcon: DefaultIcon = Info }) {
  if (!items?.length) return null;

  const tones = {
    amber: {
      wrap: "rounded-xl border border-amber-100 bg-amber-50/70 p-3",
      title: "text-amber-700",
      icon: "text-green-600",
    },
    gray: {
      wrap: "rounded-xl border border-gray-100 bg-gray-50/70 p-3",
      title: "text-gray-500",
      icon: "text-gray-400",
    },
  };
  const t = tones[tone] || tones.amber;

  return (
    <div className={t.wrap}>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${t.title}`}>{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, index) => {
          const Icon = item.icon || DefaultIcon;
          return (
            <li key={index} className="flex items-start gap-2 text-xs text-gray-600">
              <Icon size={14} className={`mt-0.5 shrink-0 ${t.icon}`} />
              <span>{item.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}