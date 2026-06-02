"use client";

import { useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Tab = "signin" | "register" | "forgot";

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const supabase = createClient();

  function switchTab(t: Tab) { setTab(t); setError(""); setSuccess(""); }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) { setError("Database not configured. Add Supabase env vars to Vercel and redeploy."); return; }
    setError(""); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      router.push("/");
      router.refresh();
    } catch {
      setError("Cannot connect to database. Check Vercel environment variables.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) { setError("Database not configured. Add Supabase env vars to Vercel and redeploy."); return; }
    setError(""); setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      if (error) { setError(error.message); return; }
      setSuccess("Account created! Check your email to confirm, then sign in.");
    } catch {
      setError("Cannot connect to database. Check Vercel environment variables.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) { setError("Database not configured."); return; }
    setError(""); setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/reset`,
      });
      if (error) { setError(error.message); return; }
      setSuccess("Password reset email sent! Check your inbox.");
    } catch {
      setError("Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!supabaseConfigured) { setError("Database not configured. Add Supabase env vars to Vercel and redeploy."); return; }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-main px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img src="/yoojel-logo-color.png" alt="Yoojel" className="mx-auto h-10 w-auto" />
          <p className="mt-2 text-sm text-gray-400">Your AI assistant</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-sidebar p-8">
          {tab !== "forgot" && (
            <>
              {/* Tabs */}
              <div className="mb-6 flex rounded-xl bg-[#1a1a1a] p-1">
                {(["signin", "register"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => switchTab(t)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                      tab === t ? "bg-[#2a2a2a] text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {t === "signin" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              {/* Google */}
              <button
                onClick={handleGoogle}
                className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-gray-500">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
            </>
          )}

          {tab === "forgot" && (
            <div className="mb-6">
              <button onClick={() => switchTab("signin")} className="mb-4 text-xs text-gray-400 hover:text-white">
                ← Back to Sign In
              </button>
              <h2 className="text-lg font-semibold text-white">Reset Password</h2>
              <p className="mt-1 text-sm text-gray-400">Enter your email and we&apos;ll send a reset link.</p>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={tab === "signin" ? handleSignIn : tab === "register" ? handleRegister : handleForgot}
            className="space-y-3"
          >
            {tab === "register" && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-brand"
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-brand"
            />
            {tab !== "forgot" && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-brand"
              />
            )}

            {tab === "signin" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchTab("forgot")}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}
            {success && <p className="text-xs text-green-400">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Please wait…" : tab === "signin" ? "Sign In" : tab === "register" ? "Create Account" : "Send Reset Link"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          By continuing you agree to our{" "}
          <a href="#" className="text-gray-400 hover:text-white">Terms</a> and{" "}
          <a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
