import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, ClipboardList, FileWarning, Loader2, Save, School, Search, ShieldCheck, Users } from "lucide-react";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import PageLoader from "@/components/PageLoader";
import { cn } from "@/lib/utils";
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
  type: z.string().min(1, "Type is required"),
  issues: z.string().min(1, "Issue is required").max(5000, "Too long"),
  solutions: z.string().max(5000, "Too long").optional().or(z.literal("")),
  recommendations: z.string().max(5000, "Too long").optional().or(z.literal("")),
  status: z.string().min(1, "Status is required"),
});

const emptyValues = { intern_id: "", type: "intern", issues: "", solutions: "", recommendations: "", status: "pending" };

const selectClass = "data-[size=default]:h-11 w-full rounded-xl";
const labelClass = "text-xs font-bold uppercase tracking-wider text-gray-700";

export default function CoordinatorIssueFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [interns, setInterns] = useState([]);
  const [internSearch, setInternSearch] = useState("");
  const [issueData, setIssueData] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

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
    api
      .get("/coordinator/issues/interns/options")
      .then((res) => setInterns(res.data.data || []))
      .catch(() => toast.error("Failed to load interns"));
  }, []);

  useEffect(() => {
    if (!isEdit) {
      setIssueData(null);
      setLoading(false);
      return;
    }
    let active = true;
    api
      .get(`/coordinator/issues/${id}`)
      .then((res) => {
        if (!active) return;
        const data = res.data.data;
        setIssueData(data);
        form.reset({
          intern_id: data.intern_id ? String(data.intern_id) : "",
          type: data.type || "intern",
          issues: data.issues || "",
          solutions: data.solutions || "",
          recommendations: data.recommendations || "",
          status: data.status || "pending",
        });
      })
      .catch((err) => {
        if (active) {
          toast.error("Failed to load issue", { description: firstErrorMessage(err) });
          navigate("/coordinator/issues");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, isEdit, form, navigate]);

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const payload = {
        intern_id: Number(values.intern_id),
        type: values.type,
        issues: values.issues,
        solutions: values.solutions || null,
        recommendations: values.recommendations || null,
        status: values.status,
      };
      if (isEdit) {
        await api.put(`/coordinator/issues/${id}`, payload);
        toast.success("Issue updated", { description: "The issue was updated." });
      } else {
        await api.post("/coordinator/issues", payload);
        toast.success("Issue created", { description: "The issue was created." });
      }
      navigate("/coordinator/issues");
    } catch (err) {
      toast.error(isEdit ? "Update failed" : "Creation failed", { description: firstErrorMessage(err) });
      const errors = err.response?.data?.errors;
      if (errors && typeof errors === "object") {
        Object.entries(errors).forEach(([name, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            form.setError(name, { message: messages[0] });
          }
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <CoordinatorLayout>
        <PageLoader />
      </CoordinatorLayout>
    );
  }

  return (
    <CoordinatorLayout>
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-xl text-gray-500">
            <Link to="/coordinator/issues">
              <ArrowLeft size={18} />
            </Link>
          </Button>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-700 to-green-500 text-white shadow-md shadow-green-600/25">
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-bold text-green-950 sm:text-2xl">
              {isEdit ? "Edit Issue" : "Add Issue"}
            </h1>
            <p className="truncate text-sm text-gray-500">
              {isEdit ? "Update the issue details." : "Create a new issue for an intern in your institute."}
            </p>
          </div>
        </div>

        <Card className="mt-4 rounded-2xl border border-gray-100 bg-white shadow-sm ring-gray-100 sm:mt-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <CardContent className="space-y-6 p-5 sm:p-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => {
                      const isIntern = field.value === "hte" ? false : true;
                      if (isEdit) {
                        return (
                          <FormItem>
                            <FormLabel className={labelClass}>Concern direction</FormLabel>
                            <div className="rounded-2xl border border-green-100 bg-green-50/60 p-4 ring-1 ring-green-100">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
                                    {isIntern ? <Users size={16} /> : <Building2 size={16} />}
                                  </span>
                                  <ArrowRight size={16} className="text-green-600" />
                                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-green-700 shadow-sm ring-1 ring-green-100">
                                    {isIntern ? <Building2 size={16} /> : <Users size={16} />}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold leading-none text-green-900">
                                    {isIntern ? "Intern has concern" : "HTE has concern"}
                                  </p>
                                  <p className="mt-1 text-xs leading-none text-green-700">
                                    {isIntern ? "Intern has issue with the HTE" : "HTE has issue with the intern"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="min-h-[1.25rem]">
                              <FormMessage />
                            </div>
                          </FormItem>
                        );
                      }
                      return (
                        <FormItem>
                          <FormLabel className={labelClass}>Concern direction *</FormLabel>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => field.onChange("intern")}
                              className={cn(
                                "group relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all",
                                field.value === "intern"
                                  ? "border-green-600 bg-green-50 ring-2 ring-green-200"
                                  : "border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/40"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
                                    field.value === "intern" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"
                                  )}
                                >
                                  <Users size={14} />
                                </span>
                                <ArrowRight
                                  size={14}
                                  className={cn(field.value === "intern" ? "text-green-600" : "text-gray-300")}
                                />
                                <span
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg",
                                    field.value === "intern" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400"
                                  )}
                                >
                                  <Building2 size={14} />
                                </span>
                              </div>
                              <div>
                                <p
                                  className={cn(
                                    "text-sm font-bold",
                                    field.value === "intern" ? "text-green-900" : "text-gray-800"
                                  )}
                                >
                                  Intern has concern
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-gray-500">Intern has issue with the HTE</p>
                              </div>
                              {field.value === "intern" && (
                                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white">
                                  <ShieldCheck size={12} />
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => field.onChange("hte")}
                              className={cn(
                                "group relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all",
                                field.value === "hte"
                                  ? "border-green-600 bg-green-50 ring-2 ring-green-200"
                                  : "border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/40"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg",
                                    field.value === "hte" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400"
                                  )}
                                >
                                  <Building2 size={14} />
                                </span>
                                <ArrowRight
                                  size={14}
                                  className={cn(field.value === "hte" ? "text-green-600" : "text-gray-300")}
                                />
                                <span
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
                                    field.value === "hte" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"
                                  )}
                                >
                                  <Users size={14} />
                                </span>
                              </div>
                              <div>
                                <p
                                  className={cn(
                                    "text-sm font-bold",
                                    field.value === "hte" ? "text-green-900" : "text-gray-800"
                                  )}
                                >
                                  HTE has concern
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-gray-500">HTE has issue with the intern</p>
                              </div>
                              {field.value === "hte" && (
                                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white">
                                  <ShieldCheck size={12} />
                                </span>
                              )}
                            </button>
                          </div>
                          <div className="min-h-[1.25rem]">
                            <FormMessage />
                          </div>
                        </FormItem>
                      );
                    }}
                  />

                  {isEdit && issueData ? (
                    <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm ring-1 ring-green-100">
                      <div className="bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 p-4 sm:p-5">
                        <div className="space-y-4">
                          <div className="flex gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur">
                              <Users size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-green-100">Intern</p>
                              <h3 className="mt-1 break-words font-heading text-[15px] font-bold leading-tight text-white sm:text-base">
                                {issueData.intern_name || "—"}
                              </h3>
                              {issueData.intern_email && (
                                <p className="mt-1 truncate text-xs text-green-100">{issueData.intern_email}</p>
                              )}
                              {issueData.academic_year && (
                                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur">
                                  <School size={12} className="shrink-0" />
                                  <span className="break-words">{issueData.academic_year}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-px bg-white/20" />
                          <div className="flex gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur">
                              <Building2 size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-green-100">
                                Host Training Establishment
                              </p>
                              <h3 className="mt-1 break-words font-heading text-[15px] font-bold leading-tight text-white sm:text-base">
                                {issueData.hte_name || "—"}
                              </h3>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
                      <div className="p-4">
                        <FormField
                          control={form.control}
                          name="intern_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Intern *</FormLabel>
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
                                      No interns available
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
                              <div className="min-h-[1.25rem]">
                                <FormMessage />
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      {(() => {
                        const selectedIntern = interns.find((i) => String(i.id) === String(form.watch("intern_id")));
                        const hteDisplay = selectedIntern?.hte_name && selectedIntern.hte_name !== "—" ? selectedIntern.hte_name : null;
                        if (!hteDisplay) {
                          return (
                            <div className="mx-4 mb-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-center">
                              <p className="text-xs font-medium text-gray-500">Select an intern to see their HTE</p>
                            </div>
                          );
                        }
                        return (
                          <div className="mx-4 mb-4 overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/50 ring-1 ring-emerald-100">
                            <div className="flex items-center gap-3 p-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                                <Building2 size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                                  Host Training Establishment
                                </p>
                                <p className="mt-1 break-words text-sm font-bold leading-tight text-emerald-900">{hteDisplay}</p>
                                {selectedIntern?.academic_year && (
                                  <p className="mt-1 text-xs text-emerald-700">{selectedIntern.academic_year}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Status *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger className={selectClass}>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="resolve">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="min-h-[1.25rem]">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
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
                                rows={4}
                                className="min-h-24 resize-y rounded-xl pl-10 pt-3"
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

                    <FormField
                      control={form.control}
                      name="solutions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Solutions (optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Proposed solutions..." rows={3} className="rounded-xl" {...field} />
                          </FormControl>
                          <div className="min-h-[1.25rem]">
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recommendations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Recommendations (optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Recommendations..." rows={3} className="rounded-xl" {...field} />
                          </FormControl>
                          <div className="min-h-[1.25rem]">
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

              </CardContent>

              <div className="flex flex-row gap-2 border-t border-gray-100 px-5 py-4 sm:justify-end sm:px-6">
                <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl sm:flex-initial" onClick={() => navigate("/coordinator/issues")}>
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
                      <Save size={16} /> {isEdit ? "Save changes" : "Create issue"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </CoordinatorLayout>
  );
}
