import { Card } from "@/components/ui/card";

export default function SectionCard({ title, subtitle, action, children, className = "" }) {
  return (
    <Card className={`h-full rounded-2xl border-gray-200 shadow-sm ${className}`}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-bold text-gray-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
    </Card>
  );
}
