"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

const FILTERS = [
  { key: "", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "in_progress", label: "В работе" },
  { key: "resolved", label: "Решённые" },
  { key: "closed", label: "Закрытые" },
];

const PRIO_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-violet-100 text-violet-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-200 text-slate-600",
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .listTickets(filter ? { status: filter, limit: "50" } : { limit: "50" })
      .then((d) => setTickets(d.tickets))
      .catch((err: { message?: string }) => setError(err.message ?? "Не удалось загрузить заявки"))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Заявки</h1>
        <Link
          href="/tickets/new"
          className="px-3 py-2 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
        >
          + Новая заявка
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key || "all"}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              filter === f.key
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md mb-4">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-sm text-slate-400 text-center">Загрузка…</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-sm text-slate-400 text-center">Нет заявок</div>
        ) : (
          tickets.map((t) => (
            <Link
              key={t._id}
              href={`/tickets/${t._id}`}
              className="block p-4 hover:bg-slate-50 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[t.status] ?? "bg-slate-100"}`}>
                      {t.status}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIO_COLOR[t.priority] ?? "bg-slate-100"}`}>
                      {t.priority}
                    </span>
                    {(t.aiCategory || t.category) && (
                      <span className="text-[10px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
                        {t.aiCategory ?? t.category}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-slate-900 truncate">{t.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {t.clientId?.name ?? "—"}
                    {t.assigneeId?.name ? ` · 👤 ${t.assigneeId.name}` : ""}
                    {t.createdAt ? ` · ${new Date(t.createdAt).toLocaleDateString("ru-RU")}` : ""}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
