import { cn } from "@/lib/utils";

export default function PageHeader({ title, subtitle, icon: Icon, action, className }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-500 px-5 py-5 shadow-sm sm:px-8 sm:py-6",
        className
      )}
    >
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          {Icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 sm:h-12 sm:w-12">
              <Icon size={22} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-heading text-lg font-bold text-white sm:text-xl">{title}</h1>
            {subtitle && <p className="mt-0.5 text-xs text-green-100 sm:text-sm">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
