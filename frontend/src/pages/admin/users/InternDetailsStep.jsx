import { GraduationCap, MapPin, Users } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InstituteProgramFields from "@/pages/admin/users/InstituteProgramFields.jsx";

const selectClass = "data-[size=default]:h-11 w-full rounded-xl";
const labelClass = "text-xs font-bold uppercase tracking-wider text-gray-700";

export default function InternDetailsStep({
  form,
  terms,
  institutes,
  programs,
  loadingTerms,
  loadingInstitutes,
  loadingPrograms,
  hideAcademicYear = false,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap size={14} className="text-green-600" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Intern details</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {!hideAcademicYear && (
          <FormField
            control={form.control}
            name="academic_year_id"
            render={() => (
              <FormItem>
                <FormLabel className={labelClass}>Academic year *</FormLabel>
                <Select
                  disabled={loadingTerms}
                  onValueChange={(value) => form.setValue("academic_year_id", value)}
                  value={form.watch("academic_year_id") || undefined}
                >
                  <FormControl>
                    <SelectTrigger className={selectClass}>
                      <SelectValue
                        placeholder={loadingTerms ? "Loading academic years..." : "Select academic year"}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {terms.map((term) => (
                      <SelectItem key={term.id} value={String(term.id)}>
                        {term.description || term.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="min-h-[1.25rem]"><FormMessage /></div>
              </FormItem>
            )}
          />
        )}

        <InstituteProgramFields
          form={form}
          institutes={institutes}
          programs={programs}
          loadingInstitutes={loadingInstitutes}
          loadingPrograms={loadingPrograms}
        />

        <FormField
          control={form.control}
          name="date_of_birth"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Date of birth *</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pick date of birth"
                  maxDate={new Date()}
                />
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="place_of_birth"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Place of birth *</FormLabel>
              <FormControl>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input placeholder="City / province of birth" className="h-11 rounded-xl pl-10" {...field} />
                </div>
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2 sm:col-span-2">
          <Users size={14} className="text-green-600" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Parents / Guardian</p>
        </div>

        <FormField
          control={form.control}
          name="fathers_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Father&apos;s name *</FormLabel>
              <FormControl>
                <Input placeholder="Full name" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mothers_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Mother&apos;s name *</FormLabel>
              <FormControl>
                <Input placeholder="Full name" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fathers_occupation"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Father&apos;s occupation *</FormLabel>
              <FormControl>
                <Input placeholder="Occupation" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mothers_occupation"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Mother&apos;s occupation *</FormLabel>
              <FormControl>
                <Input placeholder="Occupation" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fathers_contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Father&apos;s contact *</FormLabel>
              <FormControl>
                <Input placeholder="09XX XXX XXXX" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mothers_contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Mother&apos;s contact *</FormLabel>
              <FormControl>
                <Input placeholder="09XX XXX XXXX" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parents_guardian_address"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel className={labelClass}>Parents / guardian address *</FormLabel>
              <FormControl>
                <Input placeholder="Complete address" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="practicum_instructor"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel className={labelClass}>Practicum instructor *</FormLabel>
              <FormControl>
                <Input placeholder="Instructor name" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
