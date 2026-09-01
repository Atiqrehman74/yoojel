"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, ExternalLink, ImageIcon, Loader2, Mic, Video as VideoIcon } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { IMAGE_MONTHLY_LIMIT, VIDEO_MONTHLY_LIMIT, VOICE_MONTHLY_LIMIT } from "@/lib/generationUsage";

function UsageBar({ icon, label, used, limit }: { icon: React.ReactNode; label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-gray-300">
          {icon} {label}
        </span>
        <span className="text-gray-500">
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${pct >= 100 ? "bg-red-400" : "bg-gradient-to-r from-[#06b6d4] to-[#a855f7]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AccountPage() {
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [error, setError] = useState("");

  const authHeaders = async (): Promise<Record<string, string>> => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      setChecking(false);
      if (!session) return;

      try {
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (json.profile) setProfile(json.profile);
      } catch {
        // Leave profile null -- the page just shows nothing to manage.
      }
    })();
  }, []);

  const upgrade = async () => {
    setUpgradeLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Couldn't start checkout. Please try again.");
      }
    } catch (e: any) {
      setError(e?.message || "Couldn't start checkout. Please try again.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const manageBilling = async () => {
    setPortalLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Couldn't open the billing portal. Please try again.");
      }
    } catch (e: any) {
      setError(e?.message || "Couldn't open the billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-main text-gray-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-main text-gray-100">
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Link href="/" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to chat">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-bold">Account</h1>
        </header>
        <main className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
          <p className="text-sm text-gray-400">Sign in to manage your subscription.</p>
          <Link href="/auth" className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black">
            Sign In / Register
          </Link>
        </main>
      </div>
    );
  }

  const isPro = profile.plan === "pro";

  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link href="/" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to chat">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-bold">Manage Subscription</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-xl border border-white/10 bg-bubble p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Current plan</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xl font-semibold">{isPro ? "Yoojel Pro" : "Yoojel Standard"}</span>
                {isPro && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-400">
                    <Crown size={10} /> Pro
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">{profile.email}</p>
            </div>
            {isPro ? (
              <button
                onClick={manageBilling}
                disabled={portalLoading}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-hover disabled:opacity-60"
              >
                {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                Manage Billing
              </button>
            ) : (
              <button
                onClick={upgrade}
                disabled={upgradeLoading}
                className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-60"
              >
                {upgradeLoading && <Loader2 size={14} className="animate-spin" />}
                Upgrade — $5/mo
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {isPro && (
            <p className="mt-4 text-xs text-gray-500">
              Manage Billing opens Stripe's secure portal to update your payment method, view invoices, or cancel your
              subscription.
            </p>
          )}
        </div>

        {isPro && (
          <div className="mt-6 rounded-xl border border-white/10 bg-bubble p-5">
            <p className="mb-4 text-sm font-medium text-gray-200">
              This month's usage
              {profile.usage_period && <span className="ml-1.5 text-xs font-normal text-gray-500">({profile.usage_period})</span>}
            </p>
            <div className="flex flex-col gap-4">
              <UsageBar
                icon={<ImageIcon size={14} />}
                label="Images"
                used={profile.image_count ?? 0}
                limit={IMAGE_MONTHLY_LIMIT}
              />
              <UsageBar
                icon={<VideoIcon size={14} />}
                label="Videos"
                used={profile.video_count ?? 0}
                limit={VIDEO_MONTHLY_LIMIT}
              />
              <UsageBar
                icon={<Mic size={14} />}
                label="Voice generations"
                used={profile.voice_count ?? 0}
                limit={VOICE_MONTHLY_LIMIT}
              />
            </div>
            <p className="mt-4 text-[11px] text-gray-500">Usage resets at the start of each calendar month.</p>
          </div>
        )}

        {!isPro && (
          <div className="mt-6 rounded-xl border border-white/10 bg-bubble p-5 text-sm text-gray-400">
            Upgrade to Yoojel Pro for the Pro model, Image/Video/Voice Studio, Yoojel Coder, and higher generation
            limits.
          </div>
        )}
      </main>
    </div>
  );
}
