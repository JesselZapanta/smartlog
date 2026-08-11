import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Camera,
  Clock3,
  CheckCircle2,
  NotebookPen,
  FolderUp,
  UserRound,
  Building2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { LogoMark } from "@/components/Logo.jsx";
import { homeByRole } from "@/components/ProtectedRoute.jsx";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

const demoAccounts = [
  { role: "Admin", icon: UserRound, email: "admin@smartlog.test" },
  { role: "Intern", icon: GraduationCap, email: "intern@smartlog.test" },
  { role: "HTE", icon: Building2, email: "hte@smartlog.test" },
];

const featureChips = [
  { icon: Camera, text: "Photo-captured time-in" },
  { icon: NotebookPen, text: "Digital journals" },
  { icon: FolderUp, text: "Requirement tracking" },
];

const miniStats = [
  { value: "24", label: "Active interns" },
  { value: "18", label: "Partner HTEs" },
  { value: "92%", label: "Completion rate" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const user = await login(values.email, values.password);
      toast.success("Login successful", { description: `Welcome back, ${user.full_name}` });
      navigate(homeByRole[user.role] || "/admin");
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error("Email not verified", {
          description: "Enter the one-time code sent to your email to activate your account.",
        });
        navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      const message =
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.message ||
        "Unable to sign in. Please try again.";
      toast.error("Login failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  function onDemoSignIn(account) {
    form.setValue("email", account.email, { shouldValidate: true });
    form.setValue("password", "password", { shouldValidate: true });
    form.handleSubmit(onSubmit)();
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-green-700 lg:flex lg:w-[46%] lg:flex-col lg:justify-between xl:w-1/2">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

        <div className="relative p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <LogoMark size={44} className="drop-shadow-lg" />
            <div>
              <div className="font-heading text-lg font-bold leading-tight text-white">SMARTLOG</div>
              <div className="font-mono text-[11px] font-medium tracking-widest text-emerald-300">
                OJT MONITORING SYSTEM
              </div>
            </div>
          </div>

          <div className="mt-14 max-w-md">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <p className="font-heading text-sm font-bold text-white">Today's DTR</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  LIVE
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 font-heading text-sm font-bold text-white">
                  JD
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">Juan Dela Cruz</p>
                  <p className="text-xs text-emerald-200/80">BSIT 4 — Intern</p>
                </div>
                <CheckCircle2 size={18} className="ml-auto shrink-0 text-emerald-300" />
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10">
                <Clock3 size={16} className="text-emerald-300" />
                <div className="text-xs text-emerald-100/80">
                  Time in <span className="font-semibold text-white">08:02 AM</span>
                </div>
                <span className="ml-auto rounded-md bg-emerald-400/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                  Verified
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] text-emerald-100/70">
                  <span>Hours logged</span>
                  <span className="font-semibold text-white">4h 12m / 8h</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[52%] rounded-full bg-gradient-to-r from-emerald-400 to-green-500" />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {featureChips.map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-emerald-50 backdrop-blur-sm"
                >
                  <Icon size={13} className="text-emerald-300" />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 px-10 py-5 xl:px-14">
          <div className="flex gap-10">
            {miniStats.map((stat) => (
              <div key={stat.label}>
                <div className="font-heading text-xl font-bold text-white">{stat.value}</div>
                <div className="text-[11px] font-medium text-emerald-200/70">{stat.label}</div>
              </div>
            ))}
            <div className="ml-auto hidden text-right text-[11px] text-emerald-200/60 sm:block">
              Tangub City Global College
            </div>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div className="relative -mx-4 -mt-4 mb-8 overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 px-6 pb-8 pt-6 sm:mx-0 sm:mt-0 lg:hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:20px_20px]" />
            <div className="relative flex items-center gap-3">
              <LogoMark size={44} className="drop-shadow-lg" />
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
                <ShieldCheck size={13} /> Secure portal access
              </span>
              <h1 className="mt-3 font-heading text-3xl font-bold leading-tight text-gray-900">Welcome back</h1>
              <p className="mt-1.5 text-sm text-gray-500">Sign in to continue to your dashboard.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="px-5 py-4 sm:px-8">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <Input placeholder="you@tcgc.edu.ph" className="h-12 rounded-xl pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-12 rounded-xl pl-10 pr-13"
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

                <div className="mt-4 flex items-center justify-between gap-3">
                  <FormField
                    control={form.control}
                    name="remember"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="h-4.5 w-4.5 rounded-md border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-medium text-gray-600">Remember me</FormLabel>
                      </FormItem>
                    )}
                  />
                  <Link to="/forgot-password" className="text-sm font-semibold text-green-700 hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="mt-6 h-12 w-full rounded-xl bg-green-600 px-6 font-semibold text-white shadow-lg shadow-green-600/25 hover:bg-green-700 disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Signing in…
                    </>
                  ) : (
                    <>
                      Sign in <ArrowRight size={16} />
                    </>
                  )}
                </Button>

                <div className="mt-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-gray-200" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Quick demo access
                  </span>
                  <span className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.role}
                      type="button"
                      disabled={submitting}
                      onClick={() => onDemoSignIn(account)}
                      className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50/60 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-green-600/30 hover:bg-green-50 hover:text-green-700 disabled:opacity-60"
                    >
                      <account.icon size={16} className="text-green-600" />
                      {account.role}
                    </button>
                  ))}
                </div>
              </form>
            </Form>

            <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:px-8">
              <p className="text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <Link to="/register" className="font-semibold text-green-700 hover:underline">
                  Register as Intern
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-gray-400">Tangub City Global College — OJT Monitoring System</p>
        </div>
      </main>
    </div>
  );
}
