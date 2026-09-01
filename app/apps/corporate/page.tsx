"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, Loader2 } from "lucide-react";

const INTERESTS = [
  "Enterprise AI",
  "Workforce Optimization",
  "Business Process Automation",
  "AI Digital Workforce",
  "Cost Reduction",
  "Customer Service Automation",
  "Data & Decision Intelligence",
  "Other",
];

const STATS = [
  "50% workforce optimization",
  "Lower operational costs",
  "Higher productivity",
  "Smarter business operations",
];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#141a30] px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-brand";
const labelClass = "mb-1.5 block text-xs font-medium text-gray-400";

export default function CorporatePage() {
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    country: "",
    companyWebsite: "",
    employeeCount: "",
    revenueRange: "",
    fullName: "",
    jobTitle: "",
    businessEmail: "",
    phone: "",
    preferredContact: "",
    requirements: "",
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleInterest = (interest: string) => {
    setInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/leads/corporate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, interests }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit right now.");
        return;
      }
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || "Could not submit right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link href="/apps" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to Apps">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-semibold">Yoojel Corporate</h1>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Hero */}
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{ background: "linear-gradient(135deg, #06b6d4, #a855f7)" }}
        >
          <Building2 size={26} />
        </div>
        <h2 className="mt-6 text-3xl font-bold sm:text-4xl">Yoojel Corporate</h2>
        <p className="mt-2 text-lg text-gray-400">Redefining the Future of Enterprise Intelligence</p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-400">
          Yoojel Corporate is coming soon, a next-generation AI-powered corporate ecosystem
          designed to transform how organizations operate, scale, and manage resources.
        </p>

        {/* Efficiency section */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <h3 className="text-xl font-semibold">From 5,000 Employees to the Efficiency of 2,500</h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-400">
            Yoojel Corporate is designed to help organizations achieve the operational capacity
            of a 5,000-person workforce with approximately 2,500 employees, through intelligent
            automation, AI-powered workflows, and digital workforce technologies.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {STATS.map((s) => (
              <div key={s} className="flex items-center gap-2 rounded-lg border border-white/10 bg-bubble px-4 py-3 text-sm">
                <CheckCircle2 size={16} className="flex-shrink-0 text-brand" />
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Future of work */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <h3 className="text-xl font-semibold">The Future of Work Is Intelligent</h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-400">
            Yoojel Corporate combines AI, automation, enterprise intelligence, and human
            expertise to help businesses streamline operations and focus their teams on
            higher-value work.
          </p>
          <p className="mt-4 rounded-lg border border-white/10 bg-bubble px-4 py-3 text-sm font-medium text-gray-200">
            AI + Automation + Human Intelligence = The Corporate Future
          </p>
        </div>

        {/* Form */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <h3 className="text-xl font-semibold">Get Early Access</h3>
          <p className="mt-1 text-sm text-gray-400">
            Join the Yoojel Corporate early-access list and be among the first organizations to
            explore the platform.
          </p>

          {submitted ? (
            <div className="mt-6 flex items-center gap-3 rounded-lg border border-brand/30 bg-brand/10 px-4 py-4 text-sm text-gray-100">
              <CheckCircle2 size={20} className="flex-shrink-0 text-brand" />
              Thanks — you're on the early-access list. We'll be in touch.
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 flex flex-col gap-8">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Company Information</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Company Name</label>
                    <input className={inputClass} value={form.companyName} onChange={set("companyName")} />
                  </div>
                  <div>
                    <label className={labelClass}>Industry / Sector</label>
                    <input className={inputClass} value={form.industry} onChange={set("industry")} />
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <input className={inputClass} value={form.country} onChange={set("country")} />
                  </div>
                  <div>
                    <label className={labelClass}>Company Website</label>
                    <input className={inputClass} value={form.companyWebsite} onChange={set("companyWebsite")} />
                  </div>
                  <div>
                    <label className={labelClass}>Number of Employees</label>
                    <input className={inputClass} value={form.employeeCount} onChange={set("employeeCount")} />
                  </div>
                  <div>
                    <label className={labelClass}>Annual Revenue Range</label>
                    <input className={inputClass} value={form.revenueRange} onChange={set("revenueRange")} />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Your Information</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <input className={inputClass} value={form.fullName} onChange={set("fullName")} required />
                  </div>
                  <div>
                    <label className={labelClass}>Job Title / Position</label>
                    <input className={inputClass} value={form.jobTitle} onChange={set("jobTitle")} />
                  </div>
                  <div>
                    <label className={labelClass}>Business Email *</label>
                    <input type="email" className={inputClass} value={form.businessEmail} onChange={set("businessEmail")} required />
                  </div>
                  <div>
                    <label className={labelClass}>Phone / WhatsApp</label>
                    <input className={inputClass} value={form.phone} onChange={set("phone")} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Preferred Contact Method</label>
                    <select className={inputClass} value={form.preferredContact} onChange={set("preferredContact")}>
                      <option value="">Select…</option>
                      <option value="Email">Email</option>
                      <option value="Phone">Phone</option>
                      <option value="WhatsApp">WhatsApp</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Your Requirements</p>
                <label className={labelClass}>What are you interested in?</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => toggleInterest(i)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        interests.includes(i)
                          ? "border-brand bg-brand/15 text-white"
                          : "border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                <label className={`${labelClass} mt-4`}>What would you like Yoojel Corporate to help you achieve?</label>
                <textarea
                  className={inputClass}
                  rows={4}
                  value={form.requirements}
                  onChange={set("requirements")}
                  placeholder="Tell us about your requirements…"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? "Submitting…" : "Request Early Access"}
              </button>
            </form>
          )}
        </div>

        {/* Closing */}
        <div className="mt-12 border-t border-white/10 pt-8 text-center">
          <h3 className="text-lg font-semibold">Be Part of the Corporate Transformation</h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-400">
            The future of enterprise isn&apos;t about hiring more people. It&apos;s about
            empowering fewer people with dramatically more intelligence.
          </p>
          <p className="mt-4 text-sm font-medium text-gray-300">
            Yoojel Corporate — Intelligence that scales. Efficiency that transforms.
          </p>
        </div>
      </main>
    </div>
  );
}
