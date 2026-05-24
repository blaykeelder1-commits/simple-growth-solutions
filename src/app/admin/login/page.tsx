"use client";

import { Suspense, useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Activity,
  Inbox,
  Users,
} from "lucide-react";

// Reads /api/auth/session up to ~3s waiting for role to populate. After
// signIn(redirect:false), the cookie is set but the JWT-encoded role isn't
// always visible to the next request immediately — retry with backoff.
async function pollForRole(maxMs = 3000): Promise<string | undefined> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const session = await fetch("/api/auth/session", { cache: "no-store" }).then(
      (r) => r.json()
    );
    if (session?.user?.role) return session.user.role;
    await new Promise((r) => setTimeout(r, 200));
  }
  return undefined;
}

function safeCallback(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);

  useEffect(() => {
    getProviders().then((p) => setHasGoogle(!!p?.google));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setIsLoading(false);
      return;
    }

    // Poll the session endpoint until role is populated. signIn resolves the
    // moment auth succeeds, but the Set-Cookie → JWT-decoded → role-in-session
    // chain isn't instant — without retry we sometimes read an empty session
    // and route to the wrong surface.
    const role = await pollForRole();

    // Customers who wander into the staff door get bounced gently to the
    // customer portal — not an error, just a redirect with intent preserved.
    if (role !== "admin") {
      router.push("/portal");
      return;
    }

    router.push(callbackUrl || "/admin");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-gray-950 to-indigo-950 text-white">
      {/* Layered ops-style accents */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(168,85,247,0.18),transparent_50%)]" />
      </div>

      {/* Data-grid texture — same language as the admin command center */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Floating accent orbs (smaller / dimmer than customer page) */}
      <div className="absolute top-16 left-10 h-44 w-44 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-12 h-52 w-52 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

      {/* Top wordmark */}
      <header className="relative z-10 px-6 sm:px-10 pt-6">
        <Link href="/" className="inline-flex items-center gap-2.5 group w-fit">
          <div className="h-9 w-9 rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 flex items-center justify-center group-hover:bg-white/15 transition">
            <ShieldCheck className="h-4 w-4 text-cyan-300" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white/90">
            Simple Growth Solutions
          </span>
        </Link>
      </header>

      {/* Two-column body */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center min-h-[calc(100vh-180px)]">
          {/* LEFT — Staff pitch */}
          <div className="text-center lg:text-left">
            {/* Live ops badge — mirrors the admin command center's pulsing indicator */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 backdrop-blur px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-cyan-200 uppercase">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Operations · Staff Access
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Sign in to operate.{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
                Customers are waiting.
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-gray-400 max-w-lg mx-auto lg:mx-0">
              The control surface for SGS staff &mdash; dispatch tickets, track SLAs, respond to customers, and keep the engine running.
            </p>

            {/* Operator value rows */}
            <ul className="mt-7 space-y-3 max-w-md mx-auto lg:mx-0 text-left">
              {[
                { icon: Inbox, label: "Dispatch board with live SLA countdowns" },
                { icon: Activity, label: "Throughput & reliability metrics at a glance" },
                { icon: Users, label: "Customer funnel — from lead to managed" },
              ].map(({ icon: I, label }) => (
                <li key={label} className="flex items-start gap-3">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
                    <I className="h-3.5 w-3.5 text-cyan-300" />
                  </div>
                  <span className="text-gray-300">{label}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-xs text-gray-500">
              Not a staff member?{" "}
              <Link
                href="/login"
                className="font-medium text-cyan-300 hover:text-cyan-200 transition"
              >
                Customer sign-in here &rarr;
              </Link>
            </p>
          </div>

          {/* RIGHT — Form on a dark glass card */}
          <div className="w-full max-w-md mx-auto lg:ml-auto lg:mr-0">
            <div className="relative rounded-2xl bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/10 shadow-2xl shadow-cyan-500/10 p-7 sm:p-8">
              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-white/[0.08] via-white/0 to-white/0" />

              <div className="relative">
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-cyan-300/80 font-semibold mb-2">
                    <ShieldCheck className="h-3 w-3" />
                    Staff Sign-In
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    Authenticate
                  </h2>
                  <p className="mt-1.5 text-sm text-gray-400">
                    Restricted to authorized operators.
                  </p>
                </div>

                {hasGoogle && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        signIn("google", {
                          callbackUrl: callbackUrl || "/admin",
                        })
                      }
                      className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3 text-sm font-medium text-gray-100 hover:bg-white/10 hover:border-white/20 transition"
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
                        <div className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
                        <span className="bg-slate-900 px-3 text-gray-500">
                          or with credentials
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                  {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-medium uppercase tracking-wide text-gray-400 mb-1.5"
                    >
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 backdrop-blur text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/50 transition"
                        placeholder="operator@simplegrowth.local"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="password"
                        className="block text-xs font-medium uppercase tracking-wide text-gray-400"
                      >
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-medium text-cyan-300 hover:text-cyan-200 transition"
                      >
                        Forgot?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-11 py-3 border border-white/10 rounded-xl bg-white/5 backdrop-blur text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/50 transition"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-400 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                  >
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out pointer-events-none" />
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin relative" />
                        <span className="relative">Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <span className="relative">Enter Command Center</span>
                        <ArrowRight className="h-4 w-4 relative group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <p className="mt-4 text-center text-[10px] uppercase tracking-[0.2em] text-gray-600">
              Encrypted &middot; Audited &middot; Staff-only
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <StaffLoginForm />
    </Suspense>
  );
}
