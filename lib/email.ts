// Thin wrapper around Resend's REST API (https://resend.com) for outbound
// notification emails (lead-form submissions, etc). Uses their shared
// onboarding@resend.dev sender so no domain verification is required --
// swap RESEND_FROM if a verified sending domain is set up later.

const RESEND_FROM = process.env.RESEND_FROM || "Yoojel Leads <onboarding@resend.dev>";

export async function sendNotificationEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const msg = "RESEND_API_KEY not set";
    console.error("sendNotificationEmail:", msg, "skipping email for:", opts.subject);
    return { ok: false, error: msg };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("sendNotificationEmail failed:", res.status, body);
      return { ok: false, error: `${res.status} ${body}`.slice(0, 300) };
    }
    return { ok: true };
  } catch (err) {
    console.error("sendNotificationEmail error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Renders a simple label/value HTML table for a lead notification email.
export function renderLeadEmailHtml(title: string, fields: Array<[string, string | null | undefined]>): string {
  const rows = fields
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:6px 0;">${String(
          value
        ).replace(/\n/g, "<br/>")}</td></tr>`
    )
    .join("");
  return `<div style="font-family:sans-serif;font-size:14px;color:#111;">
    <h2 style="margin:0 0 12px;">${title}</h2>
    <table style="border-collapse:collapse;">${rows}</table>
  </div>`;
}
