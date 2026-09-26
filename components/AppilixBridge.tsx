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

function recordIdentity(userId: string) {
  post({ type: "firebase_record_user_identity", props: { user_identity: userId } });
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

export default function AppilixBridge() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.appilix || !supabaseConfigured) return;

    const supabase = createClient();
    let cancelled = false;

    // Identity is the email address, because that's what makes someone
    // findable on Appilix's send screen -- a UUID would mean looking every
    // recipient up in Supabase first. Falls back to the user id if an account
    // somehow has no email. Note this does put the address in a third-party
    // push dashboard, which the privacy policy's service-provider clause covers.
    const announce = (user: any) => {
      const identity: string | undefined = user?.email || user?.id;
      if (!identity || cancelled) return;
      recordIdentity(identity);
      askPermissionOnce();
    };

    supabase.auth.getUser().then((res: any) => announce(res?.data?.user));

    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: any) =>
      announce(session?.user)
    );

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return null;
}
