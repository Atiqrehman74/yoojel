// Sends a push notification through Appilix, which builds Yoojel's mobile
// apps and owns the Firebase Cloud Messaging connection -- so this is a plain
// form POST rather than an FCM integration of our own.
//
// `userIdentity` must match what components/AppilixBridge.tsx recorded on the
// device -- the signed-in user's email address. Leave it off to broadcast to
// every install.

const PUSH_ENDPOINT = "https://appilix.com/api/push-notification";

export type AppilixPush = {
  title: string;
  body: string;
  /** One or more signed-in user emails. Omitted or empty means broadcast. */
  userIdentity?: string | string[];
  /** Opened inside the app when the notification is tapped. */
  openLinkUrl?: string;
  /** Android only; must be a publicly reachable image URL. */
  imageUrl?: string;
};

export type AppilixPushResult = { ok: true } | { ok: false; error: string };

export function pushConfigured(): boolean {
  return !!process.env.APPILIX_APP_KEY && !!process.env.APPILIX_API_KEY;
}

export async function sendAppilixPush(push: AppilixPush): Promise<AppilixPushResult> {
  const appKey = process.env.APPILIX_APP_KEY;
  const apiKey = process.env.APPILIX_API_KEY;
  if (!appKey || !apiKey) {
    return { ok: false, error: "Push notifications aren't configured yet." };
  }

  const title = push.title?.trim();
  const body = push.body?.trim();
  if (!title || !body) {
    return { ok: false, error: "A notification needs both a title and a body." };
  }

  const form = new URLSearchParams();
  form.set("app_key", appKey);
  form.set("api_key", apiKey);
  form.set("notification_title", title);
  form.set("notification_body", body);

  // Appilix targets several people in one call by joining identities with "::".
  const identities = (Array.isArray(push.userIdentity) ? push.userIdentity : [push.userIdentity])
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  if (identities.length) form.set("user_identity", identities.join("::"));

  if (push.openLinkUrl) form.set("open_link_url", push.openLinkUrl);
  if (push.imageUrl) form.set("notification_image", push.imageUrl);

  try {
    const res = await fetch(PUSH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { ok: false, error: text || `Push failed (${res.status}).` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Push failed." };
  }
}
