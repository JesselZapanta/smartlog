import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  CalendarDays,
  CalendarPlus,
  CalendarCog,
  Hash,
  Tag,
  Loader2,
  Save,
} from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { statusOptions } from "@/pages/admin/academic-terms/constants.js";
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

const termSchema = z
  .object({
    code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or fewer"),
    description: z.string().min(1, "Description is required").max(255, "Description is too long"),
    status: z.string().min(1, "Status is required"),
    start_at: z.string().min(1, "Start date is required"),
    end_at: z.string().min(1, "End date is required"),
  })
  .refine((data) => !data.start_at || !data.end_at || data.end_at >= data.start_at, {
    path: ["end_at"],
    message: "End date must be on or after the start date",
  });

const formFieldNames = ["code", "description", "status", "start_at", "end_at"];

const emptyValues = {
  code: "",
  description: "",
  status: "inactive",
  start_at: "",
  end_at: "",
};

export default function AcademicTermFormDialog({ open, onOpenChange, term, onSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(term);

  const form = useForm({
    resolver: zodResolver(termSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        term
          ? {
              code: term.code || "",
              description: term.description || "",
              status: term.status || "inactive",
              start_at: term.start_at ? String(term.start_at).slice(0, 10) : "",
              end_at: term.end_at ? String(term.end_at).slice(0, 10) : "",
            }
          : emptyValues
      );
    }
  }, [open, term, form]);

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/academic-terms/${term.id}`, values);
        toast.success("Term updated", { description: `${values.description} was updated.` });
      } else {
        await api.post("/academic-terms", values);
        toast.success("Term created", { description: `${values.description} was added.` });
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
              {isEdit ? <CalendarCog size={22} /> : <CalendarPlus size={22} />}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl text-gray-900">
                {isEdit ? "Edit Academic Term" : "Add Academic Term"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {isEdit ? "Update the term details and schedule." : "Create a new school term for OJT monitoring."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-green-600" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Term details</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">Code *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input placeholder="e.g. 261" className="h-11 rounded-xl pl-10 font-mono" {...field} />
                        </div>
                      </FormControl>
                      <div className="min-h-[1.25rem]"><FormMessage /></div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Description *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input placeholder="e.g. 1ST SEM AY 2026-2027" className="h-11 rounded-xl pl-10" {...field} />
                        </div>
                      </FormControl>
                      <div className="min-h-[1.25rem]"><FormMessage /></div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-green-600" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Dates</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="start_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Start date *
                      </FormLabel>
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
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        End date *
                      </FormLabel>
                      <FormControl>
                        <Input type="date" className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <div className="min-h-[1.25rem]"><FormMessage /></div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="flex flex-row gap-2 border-t border-gray-100 pt-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl sm:flex-initial"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 flex-1 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex-initial"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> {isEdit ? "Save changes" : "Create term"}
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
