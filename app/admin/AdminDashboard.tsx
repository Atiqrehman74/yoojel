"use client";

import { useState } from "react";
import type { Profile } from "@/lib/supabase";
import { Users, MessageSquare, Crown, TrendingUp, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  users: Profile[];
  stats: { totalUsers: number; proUsers: number; totalMessages: number };
  adminEmail: string;
}

export default function AdminDashboard({ users, stats, adminEmail }: Props) {
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const freeUsers = stats.totalUsers - stats.proUsers;
  const estimatedRevenue = stats.proUsers * 19;

  return (
    <div className="min-h-screen bg-main text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-sidebar px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm">Back to Chat</span>
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <img src="/yoojel-logo-color.png" alt="Yoojel" className="h-7 w-auto" />
          <span className="text-sm font-semibold text-gray-300">Admin Dashboard</span>
        </div>
        <div className="text-xs text-gray-500">{adminEmail}</div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Stat Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: <Users size={20} />, label: "Total Users", value: stats.totalUsers, color: "text-blue-400" },
            { icon: <Crown size={20} />, label: "Pro Users", value: stats.proUsers, color: "text-amber-400" },
            { icon: <MessageSquare size={20} />, label: "Total Messages", value: stats.totalMessages.toLocaleString(), color: "text-green-400" },
            { icon: <TrendingUp size={20} />, label: "Est. Revenue", value: `$${estimatedRevenue}/mo`, color: "text-purple-400" },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-sidebar p-5">
              <div className={`mb-3 ${color}`}>{icon}</div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="mt-1 text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>

        {/* Plan breakdown */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-sidebar p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-300">Plan Distribution</h2>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${stats.totalUsers ? (stats.proUsers / stats.totalUsers) * 100 : 0}%` }}
            />
            <div className="h-full flex-1 bg-white/20" />
          </div>
          <div className="mt-3 flex gap-6 text-xs text-gray-400">
            <span><span className="font-semibold text-amber-400">Pro</span> — {stats.proUsers} users</span>
            <span><span className="font-semibold text-gray-300">Free</span> — {freeUsers} users</span>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl border border-white/10 bg-sidebar">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-300">All Users</h2>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-1.5">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-gray-200 outline-none placeholder-gray-500 w-40"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs text-gray-500">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3">Messages</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3">Admin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                          {(u.full_name ?? u.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-100">{u.full_name ?? "—"}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.plan === 'pro'
                          ? 'bg-amber-400/15 text-amber-400'
                          : 'bg-white/10 text-gray-400'
                      }`}>
                        {u.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-300">{u.message_count.toLocaleString()}</td>
                    <td className="px-6 py-3 text-gray-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      {u.is_admin && (
                        <span className="rounded-full bg-purple-400/15 px-2 py-0.5 text-xs font-semibold text-purple-400">
                          Admin
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
