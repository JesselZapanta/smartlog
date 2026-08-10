import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlignLeft, BookOpen, Loader2, Save, School } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { statusOptions, toActiveValue } from "@/pages/admin/programs/constants.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const programSchema = z.object({
  institute_id: z.string().min(1, "Institute is required"),
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  description: z.string().max(5000, "Description is too long"),
  status: z.string().min(1, "Status is required"),
});

const formFieldNames = ["institute_id", "name", "description", "is_active"];

const emptyValues = {
  institute_id: "",
  name: "",
  description: "",
  status: "active",
};

export default function ProgramFormDialog({ open, onOpenChange, program, institutes, onSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(program);

  const form = useForm({
    resolver: zodResolver(programSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        program
          ? {
              institute_id: String(program.institute_id || ""),
              name: program.name || "",
              description: program.description || "",
              status: toActiveValue(program.is_active),
            }
          : emptyValues
      );
    }
  }, [open, program, form]);

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const payload = {
        institute_id: Number(values.institute_id),
        name: values.name,
        description: values.description || null,
        is_active: values.status === "active",
      };
      if (isEdit) {
        await api.put(`/programs/${program.id}`, payload);
        toast.success("Program updated", { description: `${values.name} was updated.` });
      } else {
        await api.post("/programs", payload);
        toast.success("Program created", { description: `${values.name} was added.` });
      }
      onSaved();
    } catch (err) {
      toast.error(isEdit ? "Update failed" : "Creation failed", { description: firstErrorMessage(err) });
      const errors = err.response?.data?.errors;
      if (errors && typeof errors === "object") {
        Object.entries(errors).forEach(([name, messages]) => {
          if (formFieldNames.includes(name) && Array.isArray(messages) && messages.length > 0) {
            if (name === "is_active") {
              form.setError("status", { message: messages[0] });
            } else {
              form.setError(name, { message: messages[0] });
            }
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
              <BookOpen size={22} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl text-gray-900">
                {isEdit ? "Edit Program" : "Add Program"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {isEdit
                  ? "Update the program details and status."
                  : "Create a new program under an institute."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <School size={14} className="text-green-600" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Program details</p>
              </div>

              <div className="grid gap-4">
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">Name *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <BookOpen className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            placeholder="e.g. Bachelor of Science in Computer Science (BSCS)"
                            className="h-11 rounded-xl pl-10"
                            {...field}
                          />
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
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlignLeft size={14} className="text-green-600" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Description</p>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Details (optional)
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Textarea
                          placeholder="Additional details about the program…"
                          className="min-h-32 resize-y rounded-xl pl-10 pt-3"
                          {...field}
                        />
                        <AlignLeft className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                      </div>
                    </FormControl>
                    <div className="min-h-[1.25rem]"><FormMessage /></div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save size={16} /> {isEdit ? "Save changes" : "Create program"}
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
