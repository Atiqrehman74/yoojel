"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clapperboard, CheckCircle2, Loader2 } from "lucide-react";

const JOURNEY = [
  "AI-Powered Story & Script Development",
  "Character & World Creation",
  "AI-Assisted Cinematic Production",
  "3D Character & Environment Development",
  "Advanced VFX",
  "Animation & Motion",
  "Cinematic Scene Generation",
  "Voice & Dialogue",
  "Music & Sound Design",
  "Editing & Post-Production",
  "Custom Visual Development",
  "Feature-Length Movie Production",
];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#141a30] px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-brand";
const labelClass = "mb-1.5 block text-xs font-medium text-gray-400";

export default function MovieMakerPage() {
  const [form, setForm] = useState({
    projectTitle: "",
    genre: "",
    estimatedRuntime: "",
    country: "",
    productionStage: "",
    fullName: "",
    company: "",
    role: "",
    email: "",
    phone: "",
    portfolioUrl: "",
    description: "",
  });
  const [hasScreenplay, setHasScreenplay] = useState<boolean | null>(null);
  const [hasConceptArt, setHasConceptArt] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/leads/moviemaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, hasScreenplay, hasConceptArt }),
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

  const YesNo = ({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) => (
    <div className="flex gap-2">
      {[
        { label: "Yes", v: true },
        { label: "No", v: false },
      ].map((opt) => (
        <button
          type="button"
          key={opt.label}
          onClick={() => onChange(opt.v)}
          className={`rounded-lg border px-4 py-2 text-xs font-medium transition ${
            value === opt.v
              ? "border-brand bg-brand/15 text-white"
              : "border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link href="/apps" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to Apps">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-bold">Yoojel MovieMaker</h1>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Hero */}
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{ background: "linear-gradient(135deg, #06b6d4, #a855f7)" }}
        >
          <Clapperboard size={26} />
        </div>
        <h2 className="mt-6 text-3xl font-bold sm:text-4xl">Yoojel MovieMaker</h2>
        <p className="mt-2 text-lg text-gray-400">Your Story. Your Vision. Your Movie.</p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-400">
          Yoojel MovieMaker is a next-generation AI-powered movie creation platform built to
          transform an idea, script, or vision into a cinematic production. From storytelling
          and character development to AI, 3D environments, animation, visual effects, sound,
          and post-production, Yoojel MovieMaker brings the tools of a modern film studio into
          one intelligent creative ecosystem.
        </p>

        {/* Runtime */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <h3 className="text-xl font-bold">Create Up to a 240-Minute Feature Film</h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-400">
            Yoojel MovieMaker is being developed to support the creation of feature-length
            productions of up to 240 minutes, combining AI, 3D, VFX, animation, and cinematic
            production. Whether you are creating a science-fiction epic, action film, animated
            feature, documentary, fantasy world, or completely original cinematic universe,
            Yoojel MovieMaker is designed to help bring your vision to life.
          </p>
          <p className="mt-4 rounded-lg border border-white/10 bg-bubble px-4 py-3 text-sm font-medium text-gray-200">
            AI + 3D + VFX + Animation + Cinematic Production
          </p>
        </div>

        {/* Custom development */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <h3 className="text-xl font-bold">Custom Movie Development</h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-400">
            Every story is different. Yoojel MovieMaker will offer custom development
            capabilities for filmmakers, studios, brands, creators, and enterprises looking to
            develop unique cinematic productions.
          </p>
        </div>

        {/* Production journey */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <h3 className="text-xl font-bold">Built for the Complete Production Journey</h3>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {JOURNEY.map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-white/10 bg-bubble px-3 py-2.5 text-sm">
                <CheckCircle2 size={15} className="flex-shrink-0 text-brand" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Cinematic universe */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <h3 className="text-xl font-bold">From One Idea to an Entire Cinematic Universe</h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-400">
            Imagine describing your world, your characters, and your story — and having an
            intelligent production ecosystem help transform those ideas into cinematic reality.
          </p>
          <p className="mt-4 text-sm font-medium text-gray-300">
            Your imagination becomes the blueprint. Yoojel becomes the production engine.
          </p>
        </div>

        {/* Form */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <h3 className="text-xl font-bold">Submit Your Movie Project</h3>
          <p className="mt-1 text-sm text-gray-400">
            Whether you have a complete screenplay or only a concept, submit your project for
            early consideration.
          </p>

          {submitted ? (
            <div className="mt-6 flex items-center gap-3 rounded-lg border border-brand/30 bg-brand/10 px-4 py-4 text-sm text-gray-100">
              <CheckCircle2 size={20} className="flex-shrink-0 text-brand" />
              Thanks — your project has been submitted for early consideration.
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 flex flex-col gap-8">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Project Information</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Project / Movie Title</label>
                    <input className={inputClass} value={form.projectTitle} onChange={set("projectTitle")} />
                  </div>
                  <div>
                    <label className={labelClass}>Genre</label>
                    <input className={inputClass} value={form.genre} onChange={set("genre")} />
                  </div>
                  <div>
                    <label className={labelClass}>Estimated Runtime</label>
                    <input className={inputClass} value={form.estimatedRuntime} onChange={set("estimatedRuntime")} />
                  </div>
                  <div>
                    <label className={labelClass}>Country / Market</label>
                    <input className={inputClass} value={form.country} onChange={set("country")} />
                  </div>
                  <div>
                    <label className={labelClass}>Production Stage</label>
                    <input className={inputClass} value={form.productionStage} onChange={set("productionStage")} />
                  </div>
                  <div />
                  <div>
                    <label className={labelClass}>Do you have a screenplay?</label>
                    <YesNo value={hasScreenplay} onChange={setHasScreenplay} />
                  </div>
                  <div>
                    <label className={labelClass}>Do you have concept art or references?</label>
                    <YesNo value={hasConceptArt} onChange={setHasConceptArt} />
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
                    <label className={labelClass}>Company / Production House</label>
                    <input className={inputClass} value={form.company} onChange={set("company")} />
                  </div>
                  <div>
                    <label className={labelClass}>Role</label>
                    <input className={inputClass} value={form.role} onChange={set("role")} />
                  </div>
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input type="email" className={inputClass} value={form.email} onChange={set("email")} required />
                  </div>
                  <div>
                    <label className={labelClass}>Phone / WhatsApp</label>
                    <input className={inputClass} value={form.phone} onChange={set("phone")} />
                  </div>
                  <div>
                    <label className={labelClass}>Website / Portfolio</label>
                    <input className={inputClass} value={form.portfolioUrl} onChange={set("portfolioUrl")} />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Briefly describe your story, characters, visual style, and what you want Yoojel
                  MovieMaker to create.
                </label>
                <textarea
                  className={inputClass}
                  rows={5}
                  value={form.description}
                  onChange={set("description")}
                  placeholder="Tell us about your movie…"
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
                {submitting ? "Submitting…" : "Submit Your Movie Project"}
              </button>
            </form>
          )}
        </div>

        {/* Closing */}
        <div className="mt-12 border-t border-white/10 pt-8 text-center">
          <h3 className="text-lg font-bold">The Future of Filmmaking Is Being Rewritten.</h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-400">
            A feature film no longer has to begin with a massive studio, hundreds of
            departments, and years of traditional production. The next generation of cinema
            will combine human imagination with artificial intelligence, 3D worlds, and
            advanced visual effects.
          </p>
          <p className="mt-4 text-sm font-medium text-gray-300">
            Yoojel MovieMaker — Imagine it. Develop it. Create it.
          </p>
        </div>
      </main>
    </div>
  );
}
