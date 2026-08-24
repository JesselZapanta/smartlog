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
      <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:gap-4">
          {Icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 lg:h-12 lg:w-12">
              <Icon size={22} className="text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-lg font-bold text-white lg:text-xl">{title}</h1>
            {subtitle && <p className="mt-0.5 hidden text-xs leading-relaxed text-green-100 lg:block lg:text-sm">{subtitle}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:contents">
          {subtitle && <p className="break-words text-xs leading-snug text-green-100 lg:hidden">{subtitle}</p>}
          {action && <div className="w-full lg:ml-0 lg:w-auto lg:shrink-0 [&>button]:w-full lg:[&>button]:w-auto">{action}</div>}
        </div>
      </div>
    </div>
  );
}
