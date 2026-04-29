"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";

type NavItem = { href: string; label: string; icon: string };
type NavSection = { label: string; icon: string; items: NavItem[]; defaultOpen?: boolean };

const SECTIONS: NavSection[] = [
  {
    label: "Заявки",
    icon: "🎫",
    defaultOpen: true,
    items: [
      { href: "/tickets", label: "Все заявки", icon: "📋" },
      { href: "/tickets/new", label: "Новая заявка", icon: "✨" },
    ],
  },
  {
    label: "Клиенты",
    icon: "👥",
    items: [{ href: "/clients", label: "Все клиенты", icon: "🏢" }],
  },
  {
    label: "Аналитика",
    icon: "📈",
    items: [{ href: "/analytics", label: "Дашборд", icon: "📊" }],
  },
  {
    label: "ИИ",
    icon: "✨",
    defaultOpen: true,
    items: [{ href: "/chat", label: "Ассистент", icon: "💬" }],
  },
];

function SidebarSection({
  section,
  pathname,
  collapsed,
}: {
  section: NavSection;
  pathname: string;
  collapsed: boolean;
}) {
  const hasActive = section.items.some(
    (i) => pathname === i.href || (i.href !== "/" && pathname.startsWith(i.href))
  );
  const [open, setOpen] = useState(section.defaultOpen ?? hasActive);

  if (collapsed) {
    // Collapsed mode: just show items as icons
    return (
      <div className="space-y-1">
        {section.items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center justify-center w-10 h-10 rounded-lg text-base transition-colors ${
                active ? "bg-violet-600/20 text-violet-300" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
              }`}
            >
              {item.icon}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
      >
        <span>{section.icon}</span>
        <span className="font-medium flex-1 text-left">{section.label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 12 12" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m3 4.5 3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-neutral-800 pl-3">
          {section.items.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  active ? "bg-neutral-800 text-neutral-50 font-medium" : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
        Загрузка…
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/tickets?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="flex-1 flex">
      <aside className={`${collapsed ? "w-16" : "w-64"} shrink-0 border-r border-neutral-800 bg-[#0a0a0a] flex flex-col transition-all`}>
        {/* Brand */}
        <div className={`px-4 py-4 ${collapsed ? "px-2" : ""}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
            <div className="w-8 h-8 rounded-full bg-violet-600 grid place-items-center font-bold text-white shrink-0">
              k
            </div>
            {!collapsed && (
              <div className="font-semibold tracking-tight text-neutral-50">kazcrmai</div>
            )}
          </div>
        </div>

        <nav className={`flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-3"} py-2 space-y-1`}>
          {/* Dashboard top-level */}
          <Link
            href="/"
            title="Dashboard"
            className={`flex items-center ${collapsed ? "justify-center w-10 h-10" : "gap-2 px-3 py-2"} rounded-md text-sm transition-colors ${
              pathname === "/" ? "bg-violet-600/20 text-violet-300" : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <span>🏠</span>
            {!collapsed && <span className="font-medium">Dashboard</span>}
          </Link>

          {SECTIONS.map((s) => (
            <SidebarSection key={s.label} section={s} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>

        {/* User pill */}
        <div className="border-t border-neutral-800 p-3">
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
            <div className="w-8 h-8 rounded-full bg-neutral-700 text-neutral-200 grid place-items-center text-xs font-bold shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-neutral-100 truncate">{user.name}</div>
                <div className="text-[10px] text-neutral-500 truncate">{user.email}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={logout}
                title="Выйти"
                className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"
              >
                ⏻
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 bg-[#0a0a0a]/95 backdrop-blur">
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Развернуть" : "Свернуть"}
            className="p-2 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>

          <form onSubmit={onSearchSubmit} className="flex-1 flex items-center gap-2 max-w-2xl">
            <input
              type="search"
              placeholder="Search something..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center gap-2"
            >
              Search 🔍
            </button>
            <kbd className="hidden md:inline-flex items-center px-2 py-1 rounded border border-neutral-800 bg-neutral-900 text-[11px] text-neutral-400 font-mono">
              ⌘ J
            </kbd>
          </form>

          <div className="flex items-center gap-2">
            <button className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-800 hover:bg-neutral-800 text-sm text-neutral-300">
              💬 Feedback
            </button>
            <button title="Помощь" className="p-2 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100">
              ?
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
