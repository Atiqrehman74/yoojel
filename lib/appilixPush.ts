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

// Trimmed because a key pasted or piped into a dashboard or CLI very easily
// picks up a trailing newline, and Appilix rejects the result as an invalid
// key -- which looks identical to having the wrong key entirely.
function envKey(name: string): string | undefined {
  const raw = process.env[name];
  return raw ? raw.trim() : undefined;
}

export function pushConfigured(): boolean {
  return !!envKey("APPILIX_APP_KEY") && !!envKey("APPILIX_API_KEY");
}

export async function sendAppilixPush(push: AppilixPush): Promise<AppilixPushResult> {
  const appKey = envKey("APPILIX_APP_KEY");
  const apiKey = envKey("APPILIX_API_KEY");
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

    // Appilix reports rejected credentials and unknown recipients as HTTP 200
    // with {"status": false}, so the status code alone says nothing about
    // whether the notification actually went anywhere.
    try {
      const data = JSON.parse(text);
      if (data && data.status === false) {
        return { ok: false, error: data.message || "Appilix rejected the notification." };
      }
      // "...sent soon to 0 devices" means nobody matched the identity -- the
      // commonest cause is a device that registered a push token without ever
      // recording who is signed in.
      if (typeof data?.message === "string" && /\b0 devices\b/.test(data.message)) {
        return { ok: false, error: data.message };
      }
    } catch {
      // Not JSON; a 2xx is the best signal available.
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Push failed." };
  }
}
