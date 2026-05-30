"use client";

import { useEffect, useState } from "react";
import {
  PenSquare, Search, Library, FolderClosed, LayoutGrid,
  MoreHorizontal, PanelLeft, Trash2, LogOut, Crown, Settings,
} from "lucide-react";
import type { Conversation } from "@/lib/types";
import type { Profile } from "@/lib/supabase";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  open: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

const navItems = [
  { icon: Search, label: "Search chats" },
  { icon: Library, label: "Library" },
  { icon: FolderClosed, label: "Projects" },
  { icon: LayoutGrid, label: "Apps" },
  { icon: MoreHorizontal, label: "More" },
];

export default function Sidebar({ open, onToggle, conversations, activeId, onSelect, onNew, onDelete }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data as Profile); });
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  };

  const upgrade = async () => {
    setUpgrading(true);
    const res = await fetch('/api/stripe/checkout', { method: 'POST' });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setUpgrading(false);
  };

  const manageSubscription = async () => {
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const initials = profile
    ? (profile.full_name ?? profile.email).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="absolute left-3 top-3 z-20 rounded-lg p-2 text-gray-300 hover:bg-hover"
        aria-label="Open sidebar"
      >
        <PanelLeft size={20} />
      </button>
    );
  }

  return (
    <aside className="flex h-full w-[260px] flex-shrink-0 flex-col bg-sidebar text-gray-200">
      {/* top: logo + collapse */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2 px-1">
          <img src="/yoojel-logo-color.png" alt="Yoojel" className="w-auto object-contain" style={{ height: '41px' }} />
        </div>
        <button onClick={onToggle} className="rounded-lg p-1.5 text-gray-400 hover:bg-hover" aria-label="Collapse sidebar">
          <PanelLeft size={18} />
        </button>
      </div>

      {/* new chat */}
      <div className="px-2">
        <button onClick={onNew} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-hover">
          <PenSquare size={18} /> New chat
        </button>
      </div>

      {/* nav */}
      <nav className="mt-1 px-2">
        {navItems.map(({ icon: Icon, label }) => (
          <button key={label} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-hover">
            <Icon size={18} /> {label}
          </button>
        ))}
        {profile?.is_admin && (
          <Link href="/admin" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-hover text-purple-400">
            <Settings size={18} /> Admin
          </Link>
        )}
      </nav>

      {/* recents */}
      <div className="mt-3 flex-1 overflow-y-auto px-2">
        {conversations.length > 0 && (
          <p className="px-3 py-2 text-xs font-medium text-gray-500">Recents</p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${c.id === activeId ? "bg-hover" : "hover:bg-hover"}`}
          >
            <span className="truncate">{c.title || "New chat"}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
              className="ml-2 hidden text-gray-400 hover:text-red-400 group-hover:block"
              aria-label="Delete chat"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Upgrade banner for free users */}
      {profile && profile.plan === 'free' && (
        <div className="mx-2 mb-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <Crown size={13} /> Upgrade to Pro
          </div>
          <p className="text-xs text-gray-400 mb-2">Unlimited chats, web search & more.</p>
          <button
            onClick={upgrade}
            disabled={upgrading}
            className="w-full rounded-lg bg-amber-400 py-1.5 text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-60"
          >
            {upgrading ? 'Redirecting…' : 'Upgrade $19/mo'}
          </button>
        </div>
      )}

      {/* footer: user account */}
      <div className="border-t border-white/10 p-3 relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-hover"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="text-sm text-left flex-1 min-w-0">
            <div className="font-medium leading-tight truncate">{profile?.full_name ?? profile?.email ?? 'Your account'}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {profile?.plan === 'pro' ? (
                <><Crown size={10} className="text-amber-400" /><span className="text-amber-400">Pro</span></>
              ) : 'Free'}
            </div>
          </div>
        </button>

        {/* Account menu */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute bottom-14 left-3 right-3 z-20 rounded-xl border border-white/10 bg-[#2a2a2a] p-1 shadow-2xl">
              {!profile && (
                <Link href="/auth" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/5">
                  Sign In / Register
                </Link>
              )}
              {profile?.plan === 'pro' && (
                <button onClick={manageSubscription} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/5">
                  <Crown size={15} className="text-amber-400" /> Manage Subscription
                </button>
              )}
              {profile && (
                <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-white/5">
                  <LogOut size={15} /> Sign Out
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
