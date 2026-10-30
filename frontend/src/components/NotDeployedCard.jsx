import { FileClock } from "lucide-react";

/**
 * "Not deployed yet" state for the intern modules that require deployment.
 *
 * Deployment is the coordinator's action (`ojt_status` becomes `ongoing`), so an intern
 * who has registered but not been deployed has nothing to record against and nothing to
 * review. This replaced three byte-identical copies of the same markup so the wording
 * and tone stay identical across every module that needs it.
 *
 * `description` is the module-specific second line; the heading is fixed.
 */
export default function NotDeployedCard({ description, className = "mt-6" }) {
  return (
    <div
      className={`${className} flex flex-col items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 p-8 text-center`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
        <FileClock size={20} />
      </div>
      <p className="text-sm font-semibold text-amber-800">Not deployed yet</p>
      <p className="max-w-sm text-xs text-amber-700/80">{description}</p>
    </div>
  );
}