"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageSquare, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Conversation, Project } from "@/lib/types";

const CONVERSATIONS_KEY = "yoojel-conversations";

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [chats, setChats] = useState<Conversation[]>([]);

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

      try {
        const res = await fetch(`/api/projects/${id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data2 = await res.json();
        setProject(data2.item);
        setName(data2.item.name);
        setDescription(data2.item.description);

        const convRaw = localStorage.getItem(CONVERSATIONS_KEY);
        const allChats: Conversation[] = convRaw ? JSON.parse(convRaw) : [];
        setChats(allChats.filter((c) => c.projectId === data2.item.id));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const save = async () => {
    if (!project || !name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save project.");
        return;
      }
      setProject(data.item);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e: any) {
      setError(e?.message || "Failed to save project.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!project) return;
    if (!confirm(`Delete "${project.name}"? This can't be undone.`)) return;
    try {
      const headers = await authHeaders();
      await fetch(`/api/projects/${project.id}`, { method: "DELETE", headers });
    } catch {
      // Navigate away regardless -- the list page will just show it if the
      // delete somehow failed, no worse than before.
    }
    router.push("/projects");
  };

  if (checking || loading) {
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
          <h1 className="text-sm font-semibold">Project</h1>
        </header>
        <main className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
          <p className="text-sm text-gray-400">Sign in to view this project.</p>
          <Link href="/auth" className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black">
            Sign In / Register
          </Link>
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-main text-gray-100">
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Link href="/projects" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to Projects">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-semibold">Project</h1>
        </header>
        <main className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
          <p className="text-sm text-gray-400">Project not found.</p>
          <Link href="/projects" className="text-xs text-gray-400 underline hover:text-gray-200">
            Back to Projects
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link href="/projects" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to Projects">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-semibold">Project details</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-lg border border-white/10 bg-[#141a30] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/30"
        />

        <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mb-1 w-full resize-none rounded-lg border border-white/10 bg-[#141a30] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/30"
        />
        {project && (
          <p className="mb-1 text-[11px] text-gray-500">
            Created {new Date(project.created_at).toLocaleString()}
          </p>
        )}
        {error && <p className="mb-3 text-xs text-red-300">{error}</p>}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saved ? "Saved" : "Save"}
          </button>
          <button
            onClick={remove}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>

        <div className="mt-10">
          <p className="mb-3 text-xs font-medium text-gray-500">
            Chats in this project {chats.length > 0 && `(${chats.length})`}
          </p>
          {chats.length === 0 ? (
            <p className="text-sm text-gray-500">
              No chats yet. Open a chat, hover it in the sidebar, and use the folder icon to add it here.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {chats.map((c) => (
                <Link
                  key={c.id}
                  href={`/?chat=${c.id}`}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-bubble px-3 py-2.5 hover:border-white/25 hover:bg-hover"
                >
                  <MessageSquare size={15} className="flex-shrink-0 text-gray-400" />
                  <span className="flex-1 truncate text-sm">{c.title || "New chat"}</span>
                  <span className="flex-shrink-0 text-[11px] text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
