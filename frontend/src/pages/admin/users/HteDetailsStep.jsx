import { Building2, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import InstituteProgramFields from "@/pages/admin/users/InstituteProgramFields.jsx";

const labelClass = "text-xs font-bold uppercase tracking-wider text-gray-700";
const MAX_MOA_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HteDetailsStep({
  form,
  institutes,
  programs,
  loadingInstitutes,
  loadingPrograms,
  existingMoaUrl,
}) {
  function handleMoaChange(event, onChange) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Invalid file", { description: "Only PDF files are allowed." });
      return;
    }
    if (file.size > MAX_MOA_SIZE) {
      toast.error("File too large", { description: "MOA file must be 10 MB or smaller." });
      return;
    }
    onChange(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 size={14} className="text-green-600" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">HTE details</p>
      </div>
      <p className="text-xs text-gray-500">
        Host Training Establishment (HTE) — the company or office where interns are deployed.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel className={labelClass}>HTE / company name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Tangub City Hall" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />

        <InstituteProgramFields
          form={form}
          institutes={institutes}
          programs={programs}
          loadingInstitutes={loadingInstitutes}
          loadingPrograms={loadingPrograms}
        />

        <FormField
          control={form.control}
          name="moa"
          render={({ field }) => {
            const selectedFile = field.value instanceof File ? field.value : null;
            const hasExisting = !selectedFile && typeof field.value === "string" && Boolean(field.value);
            return (
              <FormItem className="sm:col-span-2">
                <FormLabel className={labelClass}>MOA file (PDF)</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    {hasExisting && existingMoaUrl && (
                      <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                        <a
                          href={existingMoaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-w-0 items-center gap-2 text-sm font-medium text-green-700 hover:underline"
                        >
                          <FileText size={16} className="shrink-0" />
                          <span className="truncate">Current MOA file</span>
                        </a>
                        <span className="shrink-0 text-xs text-gray-400">opens in new tab</span>
                      </div>
                    )}
                    {selectedFile && (
                      <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-green-800">
                          <FileText size={16} className="shrink-0" />
                          <span className="truncate">{selectedFile.name}</span>
                          <span className="shrink-0 text-xs text-gray-500">{formatFileSize(selectedFile.size)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => field.onChange("")}
                          className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-green-100 hover:text-red-600"
                          aria-label="Remove selected MOA file"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                    <label
                      htmlFor="moa-file-input"
                      className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-green-500 hover:bg-green-50 hover:text-green-700"
                    >
                      <Upload size={16} />
                      {selectedFile || hasExisting ? "Choose a new PDF" : "Choose PDF file"}
                    </label>
                    <input
                      id="moa-file-input"
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      name={field.name}
                      onChange={(event) => handleMoaChange(event, field.onChange)}
                    />
                  </div>
                </FormControl>
                <FormDescription className="text-xs text-gray-400">
                  PDF only, max 10 MB. {hasExisting ? "Uploading a new file replaces the current one." : "Optional."}
                </FormDescription>
                <div className="min-h-[1.25rem]"><FormMessage /></div>
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="start_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Start date</FormLabel>
              <FormControl>
                <Input type="date" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="end_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>End date</FormLabel>
              <FormControl>
                <Input type="date" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <div className="min-h-[1.25rem]"><FormMessage /></div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
