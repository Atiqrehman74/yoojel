"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderClosed, Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { migrateLegacyProjects } from "@/lib/migrateProjects";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();

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
      setSignedIn(Boolean(session));
      setChecking(false);
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };
      await migrateLegacyProjects(headers);

      try {
        const res = await fetch("/api/projects", { headers });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Failed to load projects.");
          return;
        }
        setProjects(json.items || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load projects.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openCreate = () => {
    setName("");
    setDescription("");
    setError("");
    setCreating(true);
  };

  const createProject = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const res = await fetch("/api/projects", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create project.");
        return;
      }
      setCreating(false);
      router.push(`/projects/${data.item.id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to create project.");
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-main text-gray-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="min-h-screen bg-main text-gray-100">
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Link href="/" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to chat">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-semibold">Projects</h1>
        </header>
        <main className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
          <FolderClosed size={28} className="text-gray-500" />
          <p className="text-sm text-gray-400">Sign in to create and manage projects.</p>
          <Link href="/auth" className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black">
            Sign In / Register
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link href="/" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to chat">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-semibold">Projects</h1>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-400">Group and organize your work.</p>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-gray-200"
          >
            <Plus size={14} /> New project
          </button>
        </div>

        {error && !creating && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
            <FolderClosed size={28} className="opacity-40" />
            <p className="text-sm">No projects yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-bubble p-4 hover:border-white/25 hover:bg-hover"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: "linear-gradient(135deg, #06b6d4, #a855f7)" }}>
                  <FolderClosed size={16} />
                </div>
                <p className="truncate text-sm font-medium">{p.name}</p>
                {p.description && <p className="line-clamp-2 text-xs text-gray-400">{p.description}</p>}
                <p className="text-[11px] text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
              </Link>
            ))}
          </div>
        )}
      </main>

      {creating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !saving && setCreating(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1c1c1c] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create a project</h2>
              <button
                onClick={() => setCreating(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-hover hover:text-gray-200"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <label className="mb-1.5 block text-sm font-medium text-gray-200">What are you working on?</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              placeholder="Name your project"
              className="mb-5 w-full rounded-lg border border-white/15 bg-[#141414] px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-brand"
            />

            <label className="mb-1.5 block text-sm font-medium text-gray-200">What are you trying to achieve?</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project, goals, subject, etc..."
              rows={4}
              className="mb-2 w-full resize-none rounded-lg border border-white/15 bg-[#141414] px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-brand"
            />

            {error && <p className="mb-2 text-xs text-red-300">{error}</p>}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setCreating(false)}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-200 hover:bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!name.trim() || saving}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Create project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
