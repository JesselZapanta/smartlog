import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, KeyRound, Loader2, Mail, ShieldCheck, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { LogoBadge } from "@/components/Logo.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";

const verifySchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyEmail } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const form = useForm({
    resolver: zodResolver(verifySchema),
    defaultValues: { email: searchParams.get("email") || "", code: "" },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const user = await verifyEmail(values.email, values.code);
      toast.success("Email verified", { description: `Welcome to SMARTLOG, ${user.full_name}!` });
      navigate("/admin");
    } catch (err) {
      toast.error("Verification failed", { description: firstErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    const email = form.getValues("email");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter your email first", { description: "Provide your email to resend the code." });
      return;
    }
    setResending(true);
    try {
      const res = await api.post("/verify-email/resend", { email });
      toast.success("Code sent", { description: res.data.data.message });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      form.setValue("code", "");
    } catch (err) {
      toast.error("Could not resend code", { description: firstErrorMessage(err) });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-green-700 lg:flex lg:w-[46%] lg:flex-col lg:justify-between xl:w-1/2">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

        <div className="relative p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="SMARTLOG — back to landing page" className="flex shrink-0 no-underline">
              <LogoBadge size={48} className="drop-shadow-lg" />
            </Link>
            <div>
              <div className="font-heading text-lg font-bold leading-tight text-white">SMARTLOG</div>
              <div className="font-mono text-[11px] font-medium tracking-widest text-emerald-300">
                OJT MONITORING SYSTEM
              </div>
            </div>
          </div>

          <div className="mt-14 max-w-md">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-sm">
              <p className="font-heading text-sm font-bold text-white">One last step</p>
              <p className="mt-1.5 text-xs leading-relaxed text-emerald-100/80">
                Verify your email address to activate your account and unlock photo-captured time-in, digital
                journals, and requirement tracking.
              </p>
              <div className="mt-4 space-y-2.5">
                {[
                  "Open the email we just sent you",
                  "Copy the 6-digit one-time code",
                  "Enter it here to finish",
                ].map((item, index) => (
                  <div key={item} className="flex items-center gap-2.5 text-xs text-emerald-100/90">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                      {index + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 px-10 py-5 xl:px-14">
          <div className="flex gap-10">
            <div>
              <div className="font-heading text-xl font-bold text-white">TGCC</div>
              <div className="text-[11px] font-medium text-emerald-200/70">Tangub City Global College</div>
            </div>
            <div className="ml-auto hidden text-right text-[11px] text-emerald-200/60 sm:block">
              OJT, Placement and Alumni Affairs Office
            </div>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div className="relative -mx-4 -mt-4 mb-8 overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 px-6 pb-8 pt-6 sm:mx-0 sm:mt-0 lg:hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:20px_20px]" />
            <div className="relative flex items-center gap-3">
              <Link to="/" aria-label="SMARTLOG — back to landing page" className="flex shrink-0 no-underline">
              <LogoBadge size={48} className="drop-shadow-lg" />
            </Link>
              <div>
                <div className="font-heading text-lg font-bold leading-tight text-white">SMARTLOG</div>
                <div className="font-mono text-[11px] font-medium tracking-widest text-emerald-100">
                  OJT MONITORING SYSTEM
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg shadow-gray-200/60">
            <div className="px-5 pb-2 pt-7 sm:px-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700 ring-1 ring-green-600/15">
                <MailCheck size={13} /> Email verification
              </span>
              <h1 className="mt-3 font-heading text-3xl font-bold leading-tight text-gray-900">Verify your email</h1>
              <p className="mt-1.5 text-sm text-gray-500">
                Enter the 6-digit code we sent to your inbox. It expires in 10 minutes.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="px-5 py-4 sm:px-8">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            type="email"
                            placeholder="you@tcgc.edu.ph"
                            className="h-12 rounded-xl pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        One-time code
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="123456"
                            className="h-12 rounded-xl pl-10 text-center font-mono text-lg tracking-[0.5em]"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="mt-6 h-12 w-full rounded-xl bg-green-600 px-6 font-semibold text-white shadow-lg shadow-green-600/25 hover:bg-green-700 disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      Verify &amp; continue <ArrowRight size={16} />
                    </>
                  )}
                </Button>

                <div className="mt-5 flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={resending || cooldown > 0}
                    onClick={handleResend}
                    className="h-11 rounded-xl px-4 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
                  >
                    {resending ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Sending…
                      </>
                    ) : cooldown > 0 ? (
                      <>Resend code in {cooldown}s</>
                    ) : (
                      <>Didn&apos;t get the code? Resend it</>
                    )}
                  </Button>
                  <Link to="/login" className="text-sm font-semibold text-gray-500 hover:underline">
                    Back to sign in
                  </Link>
                </div>
              </form>
            </Form>

            <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:px-8">
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500">
                <ShieldCheck size={13} className="text-green-600" />
                Your email is only used for account security and OJT updates.
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-gray-400">Tangub City Global College — OJT Monitoring System</p>
        </div>
      </main>
    </div>
  );
}
