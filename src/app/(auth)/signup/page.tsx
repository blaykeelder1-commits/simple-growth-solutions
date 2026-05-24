"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import Link from "next/link";
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Star,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    getProviders().then((providers) => {
      setHasGoogle(!!providers?.google);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    if (formData.password.length < 8) errors.password = "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords do not match";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Failed to sign in after registration");
      }

      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Layered radial wash — same language as login page */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.30),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.20),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(236,72,153,0.20),transparent_45%)]" />
      </div>

      {/* Floating ambient orbs */}
      <div className="absolute top-16 left-10 float opacity-50 pointer-events-none">
        <div className="h-40 w-40 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 blur-3xl" />
      </div>
      <div className="absolute top-24 right-12 float opacity-45 pointer-events-none" style={{ animationDelay: "2s" }}>
        <div className="h-48 w-48 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 blur-3xl" />
      </div>
      <div className="absolute bottom-16 left-1/4 float opacity-40 pointer-events-none" style={{ animationDelay: "4s" }}>
        <div className="h-44 w-44 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 blur-3xl" />
      </div>
      <div className="absolute bottom-24 right-1/4 float opacity-40 pointer-events-none" style={{ animationDelay: "3s" }}>
        <div className="h-36 w-36 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 blur-3xl" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 float opacity-25 pointer-events-none" style={{ animationDelay: "1s" }}>
        <div className="h-80 w-80 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 blur-3xl" />
      </div>

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top nav */}
      <header className="relative z-10 px-6 sm:px-10 pt-6">
        <Link href="/" className="inline-flex items-center gap-2.5 group w-fit">
          <div className="h-9 w-9 rounded-xl bg-white/70 backdrop-blur ring-1 ring-white/60 shadow-sm flex items-center justify-center group-hover:bg-white transition">
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-gray-900">
            Simple Growth Solutions
          </span>
        </Link>
      </header>

      {/* Two-column body */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center min-h-[calc(100vh-180px)]">
          {/* LEFT — Brand pitch */}
          <div className="text-center lg:text-left">
            <div className="fade-in-up inline-flex items-center gap-2 rounded-full border border-purple-200/70 bg-white/70 backdrop-blur px-4 py-1.5 text-xs font-medium text-purple-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              <span className="tracking-wide uppercase">Free Website Build</span>
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400" />
            </div>

            <h1 className="fade-in-up delay-100 mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.05]">
              Start growing{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 bg-clip-text text-transparent">
                with a free website.
              </span>
            </h1>

            <p className="fade-in-up delay-200 mt-5 text-base sm:text-lg text-gray-600 max-w-lg mx-auto lg:mx-0">
              We build it, host it, and manage it. You focus on your business.
              No credit card. No catch.
            </p>

            <ul className="fade-in-up delay-300 mt-7 space-y-3 max-w-md mx-auto lg:mx-0 text-left">
              {[
                "Custom design tailored to your business",
                "14-day free trial of Managed Website",
                "Real humans handle every edit",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-white/70 backdrop-blur ring-1 ring-white/60 shadow-sm flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT — Glass card form */}
          <div className="fade-in-up delay-200 w-full max-w-md mx-auto lg:ml-auto lg:mr-0">
            <div className="relative rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-2xl shadow-purple-500/10 p-7 sm:p-8">
              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-white/40 via-white/0 to-white/0" />

              <div className="relative">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                    Create your account
                  </h2>
                  <p className="mt-1.5 text-sm text-gray-500">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="font-semibold text-blue-700 hover:text-blue-800"
                    >
                      Sign in &rarr;
                    </Link>
                  </p>
                </div>

                {/* Google OAuth */}
                {hasGoogle && (
                  <>
                    <button
                      type="button"
                      onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
                      className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white/80 backdrop-blur px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-white hover:border-gray-300 hover:shadow transition"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.61z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                      </svg>
                      Continue with Google
                    </button>

                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-200/80" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase tracking-wide">
                        <span className="bg-white/70 backdrop-blur px-3 text-gray-500">
                          or with email
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <div className="mb-4 rounded-xl bg-red-50/90 border border-red-200 text-red-700 px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <fieldset disabled={isLoading} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          id="name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-white/90 backdrop-blur shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition ${fieldErrors.name ? "border-red-400" : "border-gray-200"}`}
                          placeholder="John Doe"
                        />
                      </div>
                      {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-white/90 backdrop-blur shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition ${fieldErrors.email ? "border-red-400" : "border-gray-200"}`}
                          placeholder="you@example.com"
                        />
                      </div>
                      {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          value={formData.password}
                          onChange={handleChange}
                          className={`block w-full pl-10 pr-11 py-3 border rounded-xl bg-white/90 backdrop-blur shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition ${fieldErrors.password ? "border-red-400" : "border-gray-200"}`}
                          placeholder="At least 8 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-white/90 backdrop-blur shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition ${fieldErrors.confirmPassword ? "border-red-400" : "border-gray-200"}`}
                          placeholder="Confirm your password"
                        />
                      </div>
                      {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                    >
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out pointer-events-none" />
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin relative" />
                          <span className="relative">Creating account...</span>
                        </>
                      ) : (
                        <>
                          <span className="relative">Create Account</span>
                          <ArrowRight className="h-4 w-4 relative group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </fieldset>
                </form>

                <p className="mt-5 text-center text-xs text-gray-500">
                  By signing up, you agree to our{" "}
                  <Link href="/questionnaire" className="underline hover:text-gray-700">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/questionnaire" className="underline hover:text-gray-700">Privacy Policy</Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="fade-in-up delay-400 mt-10 lg:mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            256-bit encryption
          </span>
          <span className="hidden sm:inline text-gray-300">&middot;</span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
            No credit card required
          </span>
          <span className="hidden sm:inline text-gray-300">&middot;</span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400" />
            Free website build included
          </span>
        </div>
      </main>
    </div>
  );
}
