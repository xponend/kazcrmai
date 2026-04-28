"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/auth";

const NAV = [
  { href: "/", label: "Заявки", icon: "📋" },
  { href: "/clients", label: "Клиенты", icon: "👥" },
  { href: "/analytics", label: "Аналитика", icon: "📊" },
  { href: "/chat", label: "ИИ-ассистент", icon: "✨" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Загрузка…
      </div>
    );
  }

  return (
    <div className="flex-1 flex">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white grid place-items-center font-bold">k</div>
            <div>
              <div className="text-sm font-semibold tracking-tight">kazcrmai</div>
              <div className="text-[10px] text-slate-500 uppercase">Admin</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-violet-50 text-violet-700 font-medium" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-2">
          <div>
            <div className="text-xs font-medium text-slate-700">{user.name}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">{user.role}</div>
          </div>
          <button
            onClick={logout}
            className="w-full text-xs px-2 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
