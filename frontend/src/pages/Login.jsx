import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
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
import AuthAnimatedSide from "@/components/AuthAnimatedSide.jsx";
import { homeByRole } from "@/components/ProtectedRoute.jsx";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
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

                <div className="mt-4 flex justify-end">
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
                      <Loader2 size={16} className="animate-spin" /> Signing in...
                    </>
                  ) : (
                    <>
                      Sign in <ArrowRight size={16} />
                    </>
                  )}
                </Button>
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
