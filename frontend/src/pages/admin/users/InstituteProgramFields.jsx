import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const selectClass = "data-[size=default]:h-11 w-full rounded-xl";
const labelClass = "text-xs font-bold uppercase tracking-wider text-gray-700";

export default function InstituteProgramFields({
  form,
  institutes,
  programs,
  loadingInstitutes,
  loadingPrograms,
}) {
  const instituteId = form.watch("institute_id");
  const availablePrograms = instituteId
    ? programs.filter((p) => p.institute_id === Number(instituteId))
    : programs;

  function onInstituteChange(value) {
    form.setValue("institute_id", value);
    form.setValue("program_id", "");
  }

  return (
    <>
      <FormField
        control={form.control}
        name="institute_id"
        render={() => (
          <FormItem>
            <FormLabel className={labelClass}>Institute *</FormLabel>
            <Select
              disabled={loadingInstitutes}
              onValueChange={onInstituteChange}
              value={form.watch("institute_id") || undefined}
            >
              <FormControl>
                <SelectTrigger className={selectClass}>
                  <SelectValue placeholder={loadingInstitutes ? "Loading institutes…" : "Select institute"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {institutes.map((institute) => (
                  <SelectItem key={institute.id} value={String(institute.id)}>
                    {institute.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="min-h-[1.25rem]"><FormMessage /></div>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="program_id"
        render={() => (
          <FormItem>
            <FormLabel className={labelClass}>Program *</FormLabel>
            <Select
              disabled={!instituteId || loadingPrograms}
              onValueChange={(value) => form.setValue("program_id", value)}
              value={form.watch("program_id") || undefined}
            >
              <FormControl>
                <SelectTrigger className={selectClass}>
                  <SelectValue
                    placeholder={
                      loadingPrograms ? "Loading programs…" : instituteId ? "Select program" : "Select institute first"
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {availablePrograms.map((program) => (
                  <SelectItem key={program.id} value={String(program.id)}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="min-h-[1.25rem]"><FormMessage /></div>
          </FormItem>
        )}
      />
    </>
  );
}
