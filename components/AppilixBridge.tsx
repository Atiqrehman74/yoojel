"use client";

import { useEffect } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase";

// Appilix wraps yoojel.com as the Android/iOS app and exposes a JS bridge on
// `window.appilix`. In a normal browser that global is absent and every call
// here is skipped, so this component is inert on the web.
//
// Push needs two things from the web side:
//   1. Record who is signed in, so a notification can be aimed at one person
//      instead of broadcast to every install. Appilix keeps the last identity
//      recorded for a device until a different user signs in on it.
//   2. Ask for notification permission once. Appilix's prompt opens the
//      device's notification settings rather than showing a native dialog, so
//      re-asking on every launch would just be nagging.

declare global {
  interface Window {
    appilix?: { postMessage: (message: string) => void };
  }
}

const PERMISSION_ASKED_KEY = "yoojel_push_permission_asked";

function post(payload: Record<string, unknown>) {
  try {
    window.appilix?.postMessage(JSON.stringify(payload));
  } catch {
    // A missing or malformed bridge must never break the page.
  }
}

const IDENTITY_KEY = "appilix_push_notification_user_identity";

// Appilix has documented three ways to hand it the signed-in user over time:
// the JS bridge (its current docs), a global variable, and a cookie (its
// knowledge base). Which one a given app build actually reads isn't
// observable from the web side, and a device that registers a push token
// without an identity can never be addressed individually -- so set all
// three. The two that a build ignores cost nothing.
function recordIdentity(identity: string) {
  post({ type: "firebase_record_user_identity", props: { user_identity: identity } });

  try {
    (window as unknown as Record<string, unknown>)[IDENTITY_KEY] = identity;
  } catch {
    // Ignore.
  }

  try {
    document.cookie = `${IDENTITY_KEY}=${encodeURIComponent(identity)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Ignore.
  }
}

function askPermissionOnce() {
  try {
    if (window.localStorage.getItem(PERMISSION_ASKED_KEY)) return;
    window.localStorage.setItem(PERMISSION_ASKED_KEY, "1");
  } catch {
    // Private mode: asking again on a later launch is harmless.
  }
  post({
    type: "firebase_notification_permission",
    props: {
      description: "Turn on notifications and Yoojel can tell you when a long generation is ready.",
      allow_btn_text: "Turn on",
      cancel_btn_text: "Not now",
    },
  });
}

// The native side injects `window.appilix` into an already-loading page, so
// it is frequently absent when React first mounts. Checking once and giving
// up left devices registered with no identity at all -- they received a push
// token but could never be addressed individually.
const BRIDGE_POLL_MS = 300;
const BRIDGE_TIMEOUT_MS = 20_000;

function whenBridgeReady(onReady: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (window.appilix) {
    onReady();
    return () => {};
  }
  let waited = 0;
  const timer = setInterval(() => {
    if (window.appilix) {
      clearInterval(timer);
      onReady();
    } else if ((waited += BRIDGE_POLL_MS) >= BRIDGE_TIMEOUT_MS) {
      // Not running inside the app. Give up quietly.
      clearInterval(timer);
    }
  }, BRIDGE_POLL_MS);
  return () => clearInterval(timer);
}

export default function AppilixBridge() {
  useEffect(() => {
    if (typeof window === "undefined" || !supabaseConfigured) return;

    const supabase = createClient();
    let cancelled = false;
    let lastRecorded: string | null = null;

    // Identity is the email address, because that's what makes someone
    // findable on Appilix's send screen -- a UUID would mean looking every
    // recipient up in Supabase first. Falls back to the user id if an account
    // somehow has no email. Note this does put the address in a third-party
    // push dashboard, which the privacy policy's service-provider clause
    // covers.
    //
    // This deliberately does NOT wait for the native bridge: the cookie and
    // global-variable routes work without it, and a device that registers a
    // push token with no identity can never be addressed individually.
    const announce = (user: any) => {
      const identity: string | undefined = user?.email || user?.id;
      if (!identity || cancelled) return;
      if (identity !== lastRecorded) {
        lastRecorded = identity;
        recordIdentity(identity);
      }
      if (window.appilix) askPermissionOnce();
    };

    const syncFromSession = () => {
      supabase.auth.getUser().then((res: any) => announce(res?.data?.user));
    };

    syncFromSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: any) =>
      announce(session?.user)
    );

    // Announce again once the bridge turns up, since it is injected into a
    // page that has usually already read the session by then.
    const stopWaiting = whenBridgeReady(() => {
      if (cancelled) return;
      lastRecorded = null;
      syncFromSession();
    });

    // Appilix can hand the device a fresh push token at any time, and a new
    // token starts with no identity attached. Re-announcing whenever the app
    // returns to the foreground makes that self-healing rather than leaving
    // the device unaddressable until the next cold start.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      lastRecorded = null;
      syncFromSession();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      stopWaiting();
      sub?.subscription?.unsubscribe?.();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
