"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderClosed, Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Project } from "@/lib/types";

const STORAGE_KEY = "yoojel-projects";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ProjectsPage() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.auth.getSession().then((res: any) => {
      setSignedIn(Boolean(res?.data?.session));
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProjects(JSON.parse(raw));
    } catch {}
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects, signedIn]);

  const createProject = () => {
    if (!name.trim()) return;
    const project: Project = {
      id: uid(),
      name: name.trim(),
      description: description.trim(),
      createdAt: Date.now(),
    };
    setProjects((prev) => [project, ...prev]);
    setName("");
    setDescription("");
    setCreating(false);
    router.push(`/projects/${project.id}`);
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
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-gray-200"
          >
            <Plus size={14} /> New project
          </button>
        </div>

        {creating && (
          <div className="mb-6 rounded-xl border border-white/10 bg-bubble p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">New project</p>
              <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-200" aria-label="Cancel">
                <X size={16} />
              </button>
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mb-2 w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-white/30"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="mb-3 w-full resize-none rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-white/30"
            />
            <button
              onClick={createProject}
              disabled={!name.trim()}
              className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
            >
              Create
            </button>
          </div>
        )}

        {projects.length === 0 ? (
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
                <p className="text-[11px] text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
