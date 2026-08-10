import { BadgeCheck, UserCog } from "lucide-react";
import InstituteProgramFields from "@/pages/admin/users/InstituteProgramFields.jsx";

export default function CoordinatorDetailsStep({
  role,
  form,
  institutes,
  programs,
  loadingInstitutes,
  loadingPrograms,
}) {
  const isInstructor = role === "ojt_instructor";
  const Icon = isInstructor ? UserCog : BadgeCheck;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-green-600" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {isInstructor ? "Instructor details" : "Coordinator details"}
        </p>
      </div>
      <p className="text-xs text-gray-500">
        Assign the institute and program this {isInstructor ? "instructor" : "coordinator"} handles.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <InstituteProgramFields
          form={form}
          institutes={institutes}
          programs={programs}
          loadingInstitutes={loadingInstitutes}
          loadingPrograms={loadingPrograms}
        />
      </div>
    </div>
  );
}
