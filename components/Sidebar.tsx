"use client";

import {
  PenSquare,
  Search,
  Library,
  FolderClosed,
  LayoutGrid,
  MoreHorizontal,
  PanelLeft,
  Trash2,
} from "lucide-react";
import type { Conversation } from "@/lib/types";

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

export default function Sidebar({
  open,
  onToggle,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: Props) {
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
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
            Y
          </div>
          <span className="text-sm font-semibold">Yoojel</span>
        </div>
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-hover"
          aria-label="Collapse sidebar"
        >
          <PanelLeft size={18} />
        </button>
      </div>

      {/* new chat */}
      <div className="px-2">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-hover"
        >
          <PenSquare size={18} /> New chat
        </button>
      </div>

      {/* nav */}
      <nav className="mt-1 px-2">
        {navItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-hover"
          >
            <Icon size={18} /> {label}
          </button>
        ))}
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
            className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${
              c.id === activeId ? "bg-hover" : "hover:bg-hover"
            }`}
          >
            <span className="truncate">{c.title || "New chat"}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
              className="ml-2 hidden text-gray-400 hover:text-red-400 group-hover:block"
              aria-label="Delete chat"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-hover">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold">
            U
          </div>
          <div className="text-sm">
            <div className="font-medium leading-tight">Your account</div>
            <div className="text-xs text-gray-500">Free</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
