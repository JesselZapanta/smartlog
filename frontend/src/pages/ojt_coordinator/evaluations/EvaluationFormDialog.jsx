import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Tag,
  Star,
  StarPlus,
  Loader2,
  Save,
} from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { categoryOptions, statusOptions } from "@/pages/ojt_coordinator/evaluations/constants.js";
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

const criterionSchema = z.object({
  category: z.string().min(1, "Category is required"),
  indicator: z.string().min(1, "Indicator is required").max(2000, "Indicator is too long"),
  status: z.string().min(1, "Status is required"),
});

const formFieldNames = ["category", "indicator", "status"];

const emptyValues = {
  category: "",
  indicator: "",
  status: "active",
};

export default function EvaluationFormDialog({ open, onOpenChange, criterion, onSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(criterion);

  const form = useForm({
    resolver: zodResolver(criterionSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        criterion
          ? {
              category: criterion.category || "",
              indicator: criterion.indicator || "",
              status: criterion.status || "active",
            }
          : emptyValues
      );
    }
  }, [open, criterion, form]);

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/coordinator/evaluations/${criterion.id}`, values);
        toast.success("Criterion updated", { description: `${values.indicator} was updated.` });
      } else {
        await api.post("/coordinator/evaluations", values);
        toast.success("Criterion created", { description: `${values.indicator} was added.` });
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
              {isEdit ? <Star size={22} /> : <StarPlus size={22} />}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl text-gray-900">
                {isEdit ? "Edit Criterion" : "Add Evaluation Criterion"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {isEdit
                  ? "Update the evaluation indicator and rating."
                  : "Create a new indicator for the evaluation form."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star size={14} className="text-green-600" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Criterion details</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Category *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((option) => (
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Status *
                      </FormLabel>
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
                  name="indicator"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Indicator *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            placeholder="e.g. Shows initiative in assigned tasks"
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
                    <Save size={16} /> {isEdit ? "Save changes" : "Create criterion"}
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
