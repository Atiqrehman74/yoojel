import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Yoojel",
  description: "Privacy Policy for Yoojel, an AI assistant by IoBM Trading LLC.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link href="/" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to Yoojel">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-bold">Privacy Policy</h1>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand">Yoojel</p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Privacy Policy</h2>
          <p className="mt-3 text-sm text-gray-400">Effective date: September 18, 2026</p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-gray-300">
          <section>
            <h3 className="mb-2 text-lg font-semibold text-white">1. About this policy</h3>
            <p>
              Yoojel is an AI assistant operated by IoBM Trading LLC ("IoBM", "we", "us", or "our").
              IoBM is a technology company based in Dubai, UAE. This policy explains what information we
              collect, how we use it, and the choices available to you when you use Yoojel.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-semibold text-white">2. Information we collect</h3>
            <p>Depending on how you use Yoojel, we may collect:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Account details such as your name, email address, authentication data, and subscription status.</li>
              <li>Prompts, conversations, uploaded files, and other content you choose to send to Yoojel.</li>
              <li>Usage information, such as feature usage and generation counts, to operate limits and subscriptions.</li>
              <li>Payment and billing details handled by our payment provider. We do not store complete payment card numbers.</li>
              <li>Technical information such as device, browser, approximate location, and log data needed for security and reliability.</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-semibold text-white">3. How we use information</h3>
            <p>We use information to provide, maintain, secure, and improve Yoojel; process subscriptions; respond to support requests; prevent abuse; troubleshoot errors; and comply with legal obligations.</p>
            <p className="mt-3">Your prompts and uploaded content may be sent to the AI, search, media, transcription, or voice providers needed to deliver the feature you request. We do not sell your personal information.</p>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-semibold text-white">4. Service providers</h3>
            <p>
              Yoojel relies on carefully selected service providers for hosting, authentication, payments, email,
              AI processing, search, and media generation. These providers process information only as needed to
              provide their services and under their own terms and privacy policies.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-semibold text-white">5. Retention and security</h3>
            <p>
              We retain information for as long as needed to provide Yoojel, maintain account and billing records,
              resolve disputes, enforce agreements, and meet legal requirements. We use reasonable technical and
              organizational safeguards, but no internet transmission or storage system can be guaranteed completely secure.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-semibold text-white">6. Your choices</h3>
            <p>
              You may request access to, correction of, or deletion of your personal information, subject to legal
              and operational requirements. You can also stop using Yoojel at any time. To make a privacy request,
              contact us at <a className="text-brand hover:underline" href="mailto:info@yoojel.com">info@yoojel.com</a>.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-semibold text-white">7. Deleting your account and data</h3>
            <p>
              To delete your Yoojel account, email{" "}
              <a className="text-brand hover:underline" href="mailto:info@yoojel.com">info@yoojel.com</a> from the address
              registered on the account, with the subject &ldquo;Delete my account&rdquo;. We will verify the request and
              delete your profile, saved conversations, projects, and generated media from our active systems.
            </p>
            <p className="mt-3">
              Some records are kept after deletion where the law requires it — for example billing and transaction records
              retained for tax and accounting purposes, and limited security logs. Backups are overwritten on a rolling
              schedule. Instructions are also available on our{" "}
              <Link className="text-brand hover:underline" href="/support">support page</Link>.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-semibold text-white">8. Children</h3>
            <p>Yoojel is not directed to children under the age required by applicable law. If you believe a child has provided personal information, contact us so we can review and remove it where appropriate.</p>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-semibold text-white">9. Changes to this policy</h3>
            <p>We may update this policy when Yoojel or applicable requirements change. The updated version will be posted on this page with a new effective date.</p>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h3 className="mb-2 text-lg font-semibold text-white">Contact</h3>
            <p>
              IoBM Trading LLC
              <br />
              Office Level 30, H Hotel, Sheikh Zayed Road
              <br />
              Dubai, United Arab Emirates
              <br />
              <a className="text-brand hover:underline" href="mailto:info@yoojel.com">info@yoojel.com</a>
            </p>
            <p className="mt-4 text-gray-400">
              You can also reach our support team through the{" "}
              <Link className="text-brand hover:underline" href="/support">Yoojel support page</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
