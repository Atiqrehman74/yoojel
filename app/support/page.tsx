import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Support — Yoojel",
  description: "Get help with Yoojel from the IoBM Trading LLC support team.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link href="/" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to Yoojel">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-bold">Support</h1>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand">Yoojel</p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">How can we help?</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">Contact the Yoojel support team for help with your account, subscription, AI features, or a technical problem.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <a href="mailto:info@yoojel.com" className="group rounded-2xl border border-white/10 bg-bubble p-6 transition hover:border-brand/50 hover:bg-hover">
            <Mail size={22} className="mb-5 text-brand" />
            <h3 className="text-lg font-semibold text-white">Email support</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">Send us the details of your question or issue.</p>
            <p className="mt-5 text-sm font-semibold text-brand group-hover:underline">info@yoojel.com</p>
          </a>
          <a href="https://www.io-bm.com/contact" target="_blank" rel="noopener noreferrer" className="group rounded-2xl border border-white/10 bg-bubble p-6 transition hover:border-brand/50 hover:bg-hover">
            <ExternalLink size={22} className="mb-5 text-brand" />
            <h3 className="text-lg font-semibold text-white">Contact IoBM</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">Reach IoBM Trading LLC through the company website.</p>
            <p className="mt-5 text-sm font-semibold text-brand group-hover:underline">io-bm.com/contact</p>
          </a>
        </div>

        <section className="mt-10 border-t border-white/10 pt-8 text-sm leading-7 text-gray-300">
          <h3 className="mb-3 text-lg font-semibold text-white">What we can help with</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li><span className="text-white">Account access</span> — sign-in problems, password resets, or changing the email on your account.</li>
            <li><span className="text-white">Subscriptions and billing</span> — upgrades, cancellations, invoices, and refund requests.</li>
            <li><span className="text-white">AI features</span> — chat, Deep Research, Image Studio, Video Studio, Voice Studio, and Coder.</li>
            <li><span className="text-white">Usage limits</span> — questions about message, search, or generation allowances on your plan.</li>
            <li><span className="text-white">Bugs and errors</span> — anything that fails, loads incorrectly, or behaves unexpectedly.</li>
            <li><span className="text-white">Privacy requests</span> — access to, correction of, or deletion of your account and data.</li>
          </ul>
        </section>

        <section className="mt-10 border-t border-white/10 pt-8 text-sm leading-7 text-gray-300">
          <h3 className="mb-3 text-lg font-semibold text-white">When you contact us</h3>
          <p>Email <a className="text-brand hover:underline" href="mailto:info@yoojel.com">info@yoojel.com</a> and include:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>The email address on your Yoojel account.</li>
            <li>The feature or page you were using.</li>
            <li>A short description of what you expected and what happened instead.</li>
            <li>A screenshot or the exact error message, if you have one.</li>
          </ul>
          <p className="mt-4">We aim to reply to every request within two business days. For security, please never send passwords, API keys, or payment card numbers by email.</p>
        </section>

        <section className="mt-10 border-t border-white/10 pt-8 text-sm leading-7 text-gray-300">
          <h3 className="mb-3 text-lg font-semibold text-white">Deleting your account</h3>
          <p>
            You can ask us to delete your Yoojel account and the data associated with it at any time. Email{" "}
            <a className="text-brand hover:underline" href="mailto:info@yoojel.com">info@yoojel.com</a> from the address on
            your account with the subject &ldquo;Delete my account&rdquo;. We will confirm the request and remove the account,
            subject to records we are required to keep for legal or billing purposes. See the{" "}
            <Link className="text-brand hover:underline" href="/privacy-policy">Privacy Policy</Link> for details.
          </p>
        </section>

        <section className="mt-10 border-t border-white/10 pt-8 text-sm leading-7 text-gray-300">
          <h3 className="mb-3 text-lg font-semibold text-white">Company details</h3>
          <p className="text-gray-400">Yoojel is operated by IoBM Trading LLC.</p>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Address</dt>
              <dd className="mt-2">
                Office Level 30, H Hotel
                <br />
                Sheikh Zayed Road
                <br />
                Dubai, United Arab Emirates
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Phone</dt>
              <dd className="mt-2">
                <a className="hover:text-brand hover:underline" href="tel:+97142366882">+971 4 236 6882</a>
                <br />
                <a className="hover:text-brand hover:underline" href="tel:+971585985971">+971 58 598 5971</a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Yoojel support</dt>
              <dd className="mt-2">
                <a className="text-brand hover:underline" href="mailto:info@yoojel.com">info@yoojel.com</a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">IoBM enquiries</dt>
              <dd className="mt-2">
                <a className="text-brand hover:underline" href="mailto:info@io-bm.com">info@io-bm.com</a>
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
