import { CheckCircle2, Loader2, Timer } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

function formatMinutes(totalMinutes) {
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

function formatEndDate(date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OjtHoursCard({
  requiredHours,
  earnedMinutes,
  institute,
  ojtStatus,
  endDate,
  onComplete,
  completing,
}) {
  const requiredMinutes = requiredHours != null ? requiredHours * 60 : null;
  const remainingMinutes = requiredMinutes != null ? Math.max(requiredMinutes - earnedMinutes, 0) : null;
  const progress = requiredMinutes ? Math.min(Math.round((earnedMinutes / requiredMinutes) * 100), 100) : 0;
  const canComplete = Boolean(onComplete) && requiredMinutes != null && remainingMinutes <= 0 && ojtStatus === "ongoing";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
          <Timer size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">OJT hours</p>
          <p className="truncate font-heading text-base font-bold text-gray-800">
            {institute ? `${institute} requirement` : "Internship hours"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Required</p>
          <p className="mt-1 font-heading text-lg font-bold text-gray-800 sm:text-xl">
            {requiredHours != null ? `${requiredHours}h` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50/70 p-3.5 ring-1 ring-green-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">Earned</p>
          <p className="mt-1 font-heading text-lg font-bold text-green-800 sm:text-xl">
            {formatMinutes(earnedMinutes)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Remaining</p>
          <p className="mt-1 font-heading text-lg font-bold text-gray-800 sm:text-xl">
            {remainingMinutes != null ? formatMinutes(remainingMinutes) : "—"}
          </p>
        </div>
      </div>

      {requiredMinutes ? (
        <>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <span>Progress</span>
              <span className="text-green-700">{progress}%</span>
            </div>
            <Progress value={progress} className="mt-1.5 h-2.5 bg-green-100" />
          </div>

          {canComplete ? (
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={onComplete}
                disabled={completing}
                className="h-10 rounded-xl bg-green-600 px-4 font-semibold hover:bg-green-700"
              >
                {completing ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                Mark hours completed
              </Button>
            </div>
          ) : ojtStatus === "hours_completed" && endDate ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-50 px-3.5 py-2.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
              <CheckCircle2 size={15} className="shrink-0" />
              Hours completed on {formatEndDate(endDate)}
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
          No OJT hour requirement has been set for this institute yet.
        </p>
      )}
    </div>
  );
}