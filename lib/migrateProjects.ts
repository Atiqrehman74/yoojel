// One-time migration for the pre-2026-08-26 Projects feature, which stored
// projects entirely in localStorage (no backend table existed). Projects
// now live in Supabase (see supabase/sql/2026-08-26-projects.sql); this
// copies any old localStorage projects up to the server, remaps the
// projectId on locally-stored conversations to the new server-generated
// ids (they were never valid UUIDs, so the old ids can't be reused as
// primary keys), and clears the old key so it doesn't get re-migrated.
//
// Safe to call from multiple mount points (Sidebar and the Projects page
// both call this) -- the flag is set synchronously before any await, so a
// second concurrent caller sees it already set and returns immediately.

const OLD_PROJECTS_KEY = "yoojel-projects";
const CONVERSATIONS_KEY = "yoojel-conversations";
const MIGRATED_FLAG = "yoojel-projects-migrated-v1";

export async function migrateLegacyProjects(authHeaders: Record<string, string>): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATED_FLAG)) return;
  localStorage.setItem(MIGRATED_FLAG, "1");

  try {
    const raw = localStorage.getItem(OLD_PROJECTS_KEY);
    const legacy: { id: string; name: string; description?: string }[] = raw ? JSON.parse(raw) : [];
    if (legacy.length === 0) return;

    const idMap: Record<string, string> = {};
    for (const p of legacy) {
      if (!p?.name?.trim()) continue;
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ name: p.name, description: p.description || "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.item) idMap[p.id] = data.item.id;
    }

    const convRaw = localStorage.getItem(CONVERSATIONS_KEY);
    if (convRaw) {
      const conversations = JSON.parse(convRaw);
      const remapped = conversations.map((c: any) =>
        c.projectId && idMap[c.projectId] ? { ...c, projectId: idMap[c.projectId] } : c
      );
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(remapped));
    }

    localStorage.removeItem(OLD_PROJECTS_KEY);
  } catch {
    // Best effort, one-time migration -- the flag stays set even on
    // failure so we don't retry (and potentially duplicate) on every load.
  }
}
