import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, KeyRound, Loader2, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
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
import { LogoBadge } from "@/components/Logo.jsx";
import AuthAnimatedSide from "@/components/AuthAnimatedSide.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

const resetSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string().min(1, "Confirm your password"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.password_confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password_confirmation"],
        message: "Passwords do not match",
      });
    }
  });

const RESEND_COOLDOWN = 60;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: searchParams.get("email") || "" },
  });

  const resetForm = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: searchParams.get("email") || "",
      code: "",
      password: "",
      password_confirmation: "",
    },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSend(values) {
    setSending(true);
    try {
      const res = await api.post("/forgot-password", { email: values.email });
      toast.success("Code sent", { description: res.data.data.message || "Check your inbox for the 6-digit code." });
      resetForm.setValue("email", values.email);
      setEmailSent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      toast.error("Could not send code", { description: firstErrorMessage(err) });
      const msg = err.response?.data?.errors?.email?.[0];
      if (msg) emailForm.setError("email", { message: msg });
    } finally {
      setSending(false);
    }
  }

  async function handleResend() {
    const email = resetForm.getValues("email") || emailForm.getValues("email");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter your email first");
      return;
    }
    setSending(true);
    try {
      const res = await api.post("/forgot-password", { email });
      toast.success("Code resent", { description: res.data.data.message });
      setCooldown(RESEND_COOLDOWN);
      resetForm.setValue("code", "");
    } catch (err) {
      toast.error("Could not resend code", { description: firstErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  async function handleReset(values) {
    setResetting(true);
    try {
      const res = await api.post("/reset-password", {
        email: values.email,
        code: values.code,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      toast.success("Password reset", { description: res.data.data.message });
      navigate("/login");
    } catch (err) {
      toast.error("Reset failed", { description: firstErrorMessage(err) });
      const errors = err.response?.data?.errors;
      if (errors?.code?.[0]) resetForm.setError("code", { message: errors.code[0] });
      if (errors?.password?.[0]) resetForm.setError("password", { message: errors.password[0] });
      if (errors?.email?.[0]) resetForm.setError("email", { message: errors.email[0] });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AuthAnimatedSide />

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
                <div className="font-mono text-[11px] font-medium tracking-widest text-emerald-100">OJT MONITORING SYSTEM</div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg shadow-gray-200/60">
            <div className="px-5 pb-2 pt-7 sm:px-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700 ring-1 ring-green-600/15">
                <KeyRound size={13} /> Forgot password
              </span>
              <h1 className="mt-3 font-heading text-3xl font-bold leading-tight text-gray-900">Reset your password</h1>
              <p className="mt-1.5 text-sm text-gray-500">
                {emailSent
                  ? "Enter the 6-digit code we sent and choose a new password. Code expires in 10 minutes."
                  : "Enter your email and we'll send a 6-digit code to reset your password."}
              </p>
            </div>

            {!emailSent ? (
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleSend)} className="px-5 py-4 sm:px-8">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input type="email" placeholder="you@tcgc.edu.ph" className="h-12 rounded-xl pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    disabled={sending}
                    className="mt-6 h-12 w-full rounded-xl bg-green-600 px-6 font-semibold text-white shadow-lg shadow-green-600/25 hover:bg-green-700 disabled:opacity-70"
                  >
                    {sending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        Send reset code <ArrowRight size={16} />
                      </>
                    )}
                  </Button>

                  <div className="mt-5 flex justify-center">
                    <Link to="/login" className="text-sm font-semibold text-gray-500 hover:underline">
                      Back to sign in
                    </Link>
                  </div>
                </form>
              </Form>
            ) : (
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(handleReset)} className="px-5 py-4 sm:px-8">
                  <FormField
                    control={resetForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input type="email" placeholder="you@tcgc.edu.ph" className="h-12 rounded-xl pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">One-time code</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              inputMode="numeric"
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

                  <FormField
                    control={resetForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">New password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="At least 8 characters"
                              className="h-12 rounded-xl pl-10 pr-11"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetForm.control}
                    name="password_confirmation"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">Confirm password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              type={showConfirm ? "text" : "password"}
                              placeholder="Repeat new password"
                              className="h-12 rounded-xl pl-10 pr-11"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm((v) => !v)}
                              aria-label={showConfirm ? "Hide password" : "Show password"}
                              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                            >
                              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    disabled={resetting}
                    className="mt-6 h-12 w-full rounded-xl bg-green-600 px-6 font-semibold text-white shadow-lg shadow-green-600/25 hover:bg-green-700 disabled:opacity-70"
                  >
                    {resetting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Resetting…
                      </>
                    ) : (
                      <>
                        Reset password <ArrowRight size={16} />
                      </>
                    )}
                  </Button>

                  <div className="mt-5 flex flex-col items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={sending || cooldown > 0}
                      onClick={handleResend}
                      className="h-11 rounded-xl px-4 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
                    >
                      {sending ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Sending…
                        </>
                      ) : cooldown > 0 ? (
                        <>Resend code in {cooldown}s</>
                      ) : (
                        <>Didn&apos;t get the code? Resend it</>
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setEmailSent(false)}
                      className="text-sm font-semibold text-gray-500 hover:underline"
                    >
                      Change email
                    </button>
                    <Link to="/login" className="text-sm font-semibold text-gray-500 hover:underline">
                      Back to sign in
                    </Link>
                  </div>
                </form>
              </Form>
            )}

            <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:px-8">
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500">
                <ShieldCheck size={13} className="text-green-600" />
                Your password is encrypted and never shared.
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-gray-400">Tangub City Global College — OJT Monitoring System</p>
        </div>
      </main>
    </div>
  );
}
