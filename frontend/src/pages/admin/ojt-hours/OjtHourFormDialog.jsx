import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Clock, Loader2, Save, School } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
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

const ojtHourSchema = z.object({
  institute_id: z.string().min(1, "Institute is required"),
  hours: z
    .string()
    .min(1, "Hours are required")
    .regex(/^\d+$/, "Enter a valid number")
    .refine((value) => Number(value) >= 1 && Number(value) <= 10000, {
      message: "Hours must be between 1 and 10000",
    }),
});

const formFieldNames = ["institute_id", "hours"];

const emptyValues = {
  institute_id: "",
  hours: "",
};

export default function OjtHourFormDialog({ open, onOpenChange, ojtHour, institutes, onSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(ojtHour);

  const form = useForm({
    resolver: zodResolver(ojtHourSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        ojtHour
          ? {
              institute_id: String(ojtHour.institute_id || ""),
              hours: String(ojtHour.hours ?? ""),
            }
          : emptyValues
      );
    }
  }, [open, ojtHour, form]);

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const payload = {
        institute_id: Number(values.institute_id),
        hours: Number(values.hours),
      };
      if (isEdit) {
        await api.put(`/ojt-hours/${ojtHour.id}`, payload);
        toast.success("OJT hours updated", { description: "The institute's hours were updated." });
      } else {
        await api.post("/ojt-hours", payload);
        toast.success("OJT hours created", { description: "The institute's hours were added." });
      }
      onSaved();
    } catch (err) {
      toast.error(isEdit ? "Update failed" : "Creation failed", { description: firstErrorMessage(err) });
      const errors = err.response?.data?.errors;
      if (errors && typeof errors === "object") {
        Object.entries(errors).forEach(([name, messages]) => {
          if (formFieldNames.includes(name) && Array.isArray(messages) && messages.length > 0) {
            form.setError(name, { message: messages[0] });
          }
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-700 to-green-500 text-white shadow-md shadow-green-600/25">
              <Clock size={22} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl text-gray-900">
                {isEdit ? "Edit OJT Hours" : "Add OJT Hours"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {isEdit
                  ? "Update the required OJT hours for the institute."
                  : "Set the required OJT hours for an institute."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <School size={14} className="text-green-600" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Institute</p>
              </div>

              <FormField
                control={form.control}
                name="institute_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Institute *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl">
                          <SelectValue placeholder="Select institute" />
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
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Required hours *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          type="number"
                          min={1}
                          max={10000}
                          placeholder="e.g. 486"
                          className="h-11 rounded-xl pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <div className="min-h-[1.25rem]"><FormMessage /></div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex flex-row gap-2 border-t border-gray-100 pt-4 sm:justify-end">
              <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl sm:flex-initial" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 flex-1 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex-initial"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save size={16} /> {isEdit ? "Save changes" : "Create hours"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
