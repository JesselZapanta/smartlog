import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2, Send, UserRound } from "lucide-react";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  intern_uuid: z.string().min(1, "Select an intern to transfer."),
  reason: z
    .string()
    .trim()
    .min(5, "Give at least 5 characters.")
    .max(2000, "The reason must be 2000 characters or fewer."),
});

export default function CreateTransferRequestDialog({ open, onOpenChange, onSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const [interns, setInterns] = useState([]);
  const [loadingInterns, setLoadingInterns] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { intern_uuid: "", reason: "" },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({ intern_uuid: "", reason: "" });

    let cancelled = false;
    setLoadingInterns(true);

    (async () => {
      try {
        const termsRes = await api.get("/academic-terms/options");
        const terms = termsRes.data.data || [];
        const activeTerm = terms.find((term) => term.status === "active");

        if (!activeTerm) {
          if (!cancelled) setInterns([]);
          return;
        }

        const res = await api.get("/instructor/interns", {
          params: { academic_year_id: activeTerm.id, per_page: 100 },
        });

        const eligible = (res.data.data || []).filter((intern) =>
          ["ongoing", "hours_completed"].includes(intern.ojt_status)
        );

        if (!cancelled) setInterns(eligible);
      } catch (err) {
        if (!cancelled) {
          toast.error("Failed to load interns", { description: firstErrorMessage(err) });
        }
      } finally {
        if (!cancelled) setLoadingInterns(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, form]);

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      await api.post("/instructor/transfer-requests", values);
      toast.success("Transfer requested", {
        description: "The host establishment and your coordinator were notified.",
      });
      onSaved();
    } catch (err) {
      toast.error("Request failed", { description: firstErrorMessage(err) });
      const errors = err.response?.data?.errors;
      if (errors && typeof errors === "object") {
        Object.entries(errors).forEach(([name, messages]) => {
          if (["intern_uuid", "reason"].includes(name) && Array.isArray(messages) && messages.length > 0) {
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-700 to-green-500 text-white shadow-md shadow-green-600/25">
              <ArrowLeftRight size={22} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl text-gray-900">New Transfer Request</DialogTitle>
              <DialogDescription className="text-sm">
                Request that an intern be reassigned to a different host establishment.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
            <FormField
              control={form.control}
              name="intern_uuid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">Intern *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined} disabled={loadingInterns}>
                    <FormControl>
                      <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl">
                        <SelectValue placeholder={loadingInterns ? "Loading interns..." : "Select an intern"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {interns.length === 0 && !loadingInterns ? (
                        <div className="px-3 py-6 text-center text-sm text-gray-400">
                          No deployed interns available to transfer.
                        </div>
                      ) : (
                        interns.map((intern) => (
                          <SelectItem key={intern.uuid} value={intern.uuid}>
                            {intern.full_name}
                            {intern.program ? ` — ${intern.program}` : ""}
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

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">Reason *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain why this intern needs a new host establishment..."
                      className="min-h-28 rounded-xl"
                      {...field}
                    />
                  </FormControl>
                  <div className="min-h-[1.25rem]">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <div className="flex items-start gap-2.5 rounded-xl bg-sky-50 p-3 ring-1 ring-sky-200">
              <UserRound size={16} className="mt-0.5 shrink-0 text-sky-600" />
              <p className="text-xs leading-relaxed text-sky-800">
                The intern&apos;s current host must accept the transfer and both sides complete their evaluations before
                your coordinator can assign a new host.
              </p>
            </div>

            <DialogFooter className="flex flex-row gap-2 border-t border-gray-100 pt-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl sm:flex-initial"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || interns.length === 0}
                className="h-11 flex-1 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex-initial"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send request
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
