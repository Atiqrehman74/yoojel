"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Supabase puts the session from the reset link into the URL hash.
    // The browser client picks it up automatically on load.
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setError(""); setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError(error.message); return; }
      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setError("Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-main px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/yoojel-logo-color.png" alt="Yoojel" className="mx-auto h-10 w-auto" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-sidebar p-8">
          <h2 className="mb-1 text-lg font-semibold text-white">Set New Password</h2>
          <p className="mb-6 text-sm text-gray-400">Enter a new password for your account.</p>

          {success ? (
            <p className="text-sm text-green-400">Password updated! Redirecting…</p>
          ) : (
            <form onSubmit={handleReset} className="space-y-3">
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-brand"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-brand"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
