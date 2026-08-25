import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Building2, ClipboardList, FileWarning, Loader2, Save, School, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const schema = z.object({
  issues: z.string().min(1, "Issue is required").max(5000, "Too long"),
});

const formFieldNames = ["issues"];
const emptyValues = { issues: "" };

const labelClass = "text-xs font-bold uppercase tracking-wider text-gray-700";

export default function InternIssueFormDialog({ open, onOpenChange, onSaved, issue, readOnly = false, hte }) {
  const [submitting, setSubmitting] = useState(false);
  const [hteInfo, setHteInfo] = useState(hte || null);
  const isCreate = !issue;
  const isView = Boolean(issue) && (readOnly || issue.status === "resolve");
  const isEdit = Boolean(issue) && !isView;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    if (isView || isEdit) {
      form.reset({ issues: issue?.issues || "" });
      if (issue?.hte_name) {
        setHteInfo({ name: issue.hte_name });
      }
      return;
    }
    form.reset(emptyValues);
    if (hte) {
      setHteInfo(hte);
    } else {
      api
        .get("/intern/issues/hte")
        .then((res) => setHteInfo(res.data.data))
        .catch(() => setHteInfo(null));
    }
  }, [open, isView, isEdit, issue, form, hte]);

  async function onSubmit(values) {
    if (isView) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/intern/issues/${issue.id}`, { issues: values.issues });
        toast.success("Issue updated", { description: "The issue was updated." });
      } else {
        await api.post("/intern/issues", { issues: values.issues });
        toast.success("Issue reported", { description: "The coordinator has been notified." });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(isEdit ? "Update failed" : "Failed to report issue", { description: firstErrorMessage(err) });
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

  const displayHte = hteInfo || (issue ? { name: issue.hte_name } : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-700 to-green-500 text-white shadow-md shadow-green-600/25">
              <AlertTriangle size={22} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl text-gray-900">
                {isCreate ? "Report an Issue" : isEdit ? "Edit Issue" : "Issue Details"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {isCreate
                  ? "Describe the issue for your assigned HTE."
                  : isEdit
                    ? "Update the issue details."
                    : "View the reported issue."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm ring-1 ring-green-100">
              {displayHte ? (
                <>
                  <div className="bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 p-4 sm:p-5">
                    <div className="flex gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur">
                        <Building2 size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-100">
                          Host Training Establishment
                        </p>
                        <h3 className="mt-1 break-words font-heading text-[15px] font-bold leading-tight text-white sm:text-base">
                          {displayHte.name}
                        </h3>
                        {displayHte.institute && (
                          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur">
                            <School size={12} className="shrink-0" />
                            <span className="break-words">{displayHte.institute}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 bg-green-50/70 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-green-700 shadow-sm ring-1 ring-green-100">
                      <ShieldCheck size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-none text-green-900">Your assigned HTE</p>
                      <p className="mt-1 text-xs leading-none text-green-700">Reporting concern for this placement</p>
                    </div>
                    {displayHte.status && (
                      <Badge className="ml-2 shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold capitalize text-green-700 ring-1 ring-green-200">
                        {displayHte.status}
                      </Badge>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 bg-amber-50 p-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm ring-1 ring-amber-200">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900">No HTE Assigned</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-amber-800">
                      You are not assigned to an HTE yet. You cannot report an issue until your coordinator assigns you
                      to a host training establishment.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList size={14} className="text-green-600" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Issue details</p>
              </div>

              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="issues"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Issue *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea
                            placeholder="Describe the issue in detail..."
                            rows={6}
                            className="min-h-32 resize-y rounded-xl pl-10 pt-3"
                            disabled={isView}
                            {...field}
                          />
                          <FileWarning className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                        </div>
                      </FormControl>
                      <div className="min-h-[1.25rem]">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="flex-row justify-end gap-2 border-t border-gray-100 pt-4">
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => onOpenChange(false)}>
                {isView ? "Close" : "Cancel"}
              </Button>
              {!isView && (
                <Button
                  type="submit"
                  disabled={submitting || (!displayHte && isCreate)}
                  className="h-11 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> {isEdit ? "Saving..." : "Reporting..."}
                    </>
                  ) : (
                    <>
                      <Save size={16} /> {isEdit ? "Save changes" : "Submit Issue"}
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
