import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ClipboardList,
  FileWarning,
  Loader2,
  Lock,
  Save,
  School,
  Search,
  Users,
} from "lucide-react";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import PageLoader from "@/components/PageLoader";
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

/**
 * The concern direction is fixed by the page, not chosen by the user — each
 * concern direction has its own route, controller and list page.
 */
const FORM_CONFIGS = {
  intern: {
    path: "/coordinator/intern-issues",
    heading: "Intern Issue",
    concernTitle: "Intern has concern",
    concernSubtitle: "Intern has issue with the HTE",
    reporter: "the intern",
    fromIcon: Users,
    toIcon: Building2,
    tone: {
      card: "border-purple-100 bg-purple-50/60 ring-purple-100",
      text: "text-purple-900",
      sub: "text-purple-700",
      badge: "bg-purple-600",
      accent: "text-purple-600",
    },
  },
  hte: {
    path: "/coordinator/hte-issues",
    heading: "HTE Issue",
    concernTitle: "HTE has concern",
    concernSubtitle: "HTE has issue with the intern",
    reporter: "the HTE",
    fromIcon: Building2,
    toIcon: Users,
    tone: {
      card: "border-blue-100 bg-blue-50/60 ring-blue-100",
      text: "text-blue-900",
      sub: "text-blue-700",
      badge: "bg-blue-600",
      accent: "text-blue-600",
    },
  },
};

const schema = z.object({
  intern_id: z.string().min(1, "Intern is required"),
  issues: z.string().min(1, "Issue is required").max(5000, "Too long"),
  solutions: z.string().max(5000, "Too long").optional().or(z.literal("")),
  recommendations: z.string().max(5000, "Too long").optional().or(z.literal("")),
  status: z.string().min(1, "Status is required"),
});

const emptyValues = { intern_id: "", issues: "", solutions: "", recommendations: "", status: "pending" };

const selectClass = "data-[size=default]:h-11 w-full rounded-xl";
const labelClass = "text-xs font-bold uppercase tracking-wider text-gray-700";

export default function CoordinatorIssueFormPage({ issueType = "intern" }) {
  const config = FORM_CONFIGS[issueType] ?? FORM_CONFIGS.intern;
  const FromIcon = config.fromIcon;
  const ToIcon = config.toIcon;

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
      .get(`${config.path}/${id}`)
      .then((res) => {
        if (!active) return;
        const data = res.data.data;
        setIssueData(data);
        form.reset({
          intern_id: data.intern_id ? String(data.intern_id) : "",
          issues: data.issues || "",
          solutions: data.solutions || "",
          recommendations: data.recommendations || "",
          status: data.status || "pending",
        });
      })
      .catch((err) => {
        if (active) {
          toast.error("Failed to load issue", { description: firstErrorMessage(err) });
          navigate(config.path);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, isEdit, form, navigate, config]);

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const payload = {
        intern_id: Number(values.intern_id),
        solutions: values.solutions || null,
        recommendations: values.recommendations || null,
        status: values.status,
      };
      if (isEdit) {
        await api.put(`${config.path}/${id}`, payload);
        toast.success("Issue updated", { description: "The issue was updated." });
      } else {
        await api.post(config.path, payload);
        toast.success("Issue created", { description: "The issue was created." });
      }
      navigate(config.path);
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
            <Link to={config.path}>
              <ArrowLeft size={18} />
            </Link>
          </Button>
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${config.tone.badge}`}
          >
            <FromIcon size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-bold text-green-950 sm:text-2xl">
              {isEdit ? `View ${config.heading}` : `Add ${config.heading}`}
            </h1>
            <p className="truncate text-sm text-gray-500">
              {isEdit
                ? `Reported by ${config.reporter}. Update the solutions and status below.`
                : `Record a concern raised by ${config.reporter}.`}
            </p>
          </div>
        </div>

        <Card className="mt-4 rounded-2xl border border-gray-100 bg-white shadow-sm ring-gray-100 sm:mt-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <CardContent className="space-y-6 p-5 sm:p-6">
                <div className="space-y-4">
                  <FormItem>
                    <FormLabel className={labelClass}>Concern direction</FormLabel>
                    <div className={`rounded-2xl border p-4 ring-1 ${config.tone.card}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm ${config.tone.badge}`}>
                            <FromIcon size={16} />
                          </span>
                          <ArrowRight size={16} className={config.tone.accent} />
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm ring-1 ring-gray-200">
                            <ToIcon size={16} />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold leading-none ${config.tone.text}`}>{config.concernTitle}</p>
                          <p className={`mt-1 text-xs leading-none ${config.tone.sub}`}>{config.concernSubtitle}</p>
                        </div>
                      </div>
                    </div>
                  </FormItem>

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
                        <FormLabel className={labelClass}>Issue (read-only)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Textarea
                              placeholder="No issue description was provided."
                              rows={4}
                              readOnly
                              aria-readonly="true"
                              className="min-h-24 resize-y rounded-xl bg-gray-50 pl-10 pt-3 text-gray-600"
                              {...field}
                            />
                            <FileWarning className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                            <Lock
                              size={13}
                              className="pointer-events-none absolute right-3 top-3.5 text-gray-400"
                              aria-hidden="true"
                            />
                          </div>
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          Submitted by {config.reporter}. This text is locked and cannot be changed.
                        </p>
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
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl sm:flex-initial"
                  onClick={() => navigate(config.path)}
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