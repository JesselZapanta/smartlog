import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, ClipboardList, FileWarning, Loader2, Save, Search, Users } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
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

const schema = z.object({
  intern_id: z.string().min(1, "Intern is required"),
  issues: z.string().min(1, "Issue is required").max(5000, "Too long"),
});

const formFieldNames = ["intern_id", "issues"];
const emptyValues = { intern_id: "", issues: "" };

const selectClass = "data-[size=default]:h-11 w-full rounded-xl";
const labelClass = "text-xs font-bold uppercase tracking-wider text-gray-700";

export default function HteIssueFormDialog({ open, onOpenChange, onSaved, issue, readOnly = false }) {
  const [interns, setInterns] = useState([]);
  const [internSearch, setInternSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isCreate = !issue;
  const isView = Boolean(issue) && (readOnly || issue.status === "resolve");
  const isEdit = Boolean(issue) && !isView;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const filteredInterns = useMemo(() => {
    const query = internSearch.trim().toLowerCase();
    if (!query) return interns;
    return interns.filter((intern) => {
      const haystack = `${intern.full_name || ""} ${intern.email || ""} ${intern.ojt_status || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [interns, internSearch]);

  useEffect(() => {
    if (!open) return;
    if (isView) {
      form.reset({
        intern_id: issue?.intern_id ? String(issue.intern_id) : "",
        issues: issue?.issues || "",
      });
      return;
    }

    if (isEdit) {
      form.reset({
        intern_id: issue?.intern_id ? String(issue.intern_id) : "",
        issues: issue?.issues || "",
      });
    } else {
      form.reset(emptyValues);
    }
    setInternSearch("");
    api
      .get("/hte/issues/assignable-interns/options")
      .then((res) => setInterns(res.data.data || []))
      .catch(() => toast.error("Failed to load interns"));
  }, [open, isView, isEdit, issue, form]);

  async function onSubmit(values) {
    if (isView) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/hte/issues/${issue.id}`, {
          intern_id: Number(values.intern_id),
          issues: values.issues,
        });
        toast.success("Issue updated", { description: "The issue was updated." });
      } else {
        await api.post("/hte/issues", {
          intern_id: Number(values.intern_id),
          issues: values.issues,
        });
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
                  ? "Describe the issue for your assigned intern."
                  : isEdit
                    ? "Update the issue details."
                    : "View the reported issue."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-green-600" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Intern</p>
              </div>

              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="intern_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Intern *</FormLabel>
                      {isView ? (
                        <div className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm font-medium text-gray-700">
                          {issue?.intern_name || "—"}
                          {issue?.intern_email ? (
                            <span className="ml-1.5 truncate text-xs font-normal text-gray-500">
                              — {issue.intern_email}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger className={selectClass}>
                              <SelectValue placeholder="Select an intern" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <div className="sticky top-0 z-10 -m-1 mb-1 border-b border-gray-100 bg-white p-2">
                              <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                  value={internSearch}
                                  onChange={(event) => setInternSearch(event.target.value)}
                                  onKeyDown={(event) => event.stopPropagation()}
                                  placeholder="Search intern..."
                                  className="h-9 rounded-lg pl-9 text-sm"
                                />
                              </div>
                            </div>
                            {interns.length === 0 ? (
                              <SelectItem value="__none" disabled>
                                No assigned interns
                              </SelectItem>
                            ) : filteredInterns.length === 0 ? (
                              <div className="px-3 py-6 text-center text-sm text-gray-500">No interns match your search</div>
                            ) : (
                              filteredInterns.map((intern) => (
                                <SelectItem key={intern.id} value={String(intern.id)}>
                                  {intern.full_name} — {intern.email} ({intern.ojt_status})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="min-h-[1.25rem]"><FormMessage /></div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="h-px bg-gray-100" />

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
                      <div className="min-h-[1.25rem]"><FormMessage /></div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => onOpenChange(false)}>
                {isView ? "Close" : "Cancel"}
              </Button>
              {!isView && (
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> {isEdit ? "Saving…" : "Reporting…"}
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
