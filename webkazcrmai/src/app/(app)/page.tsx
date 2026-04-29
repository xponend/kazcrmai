"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

const STATUS_FILTERS = [
  { key: "", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "in_progress", label: "В работе" },
  { key: "resolved", label: "Решённые" },
  { key: "closed", label: "Закрытые" },
];

const PRIORITY_FILTERS = [
  { key: "", label: "Все приоритеты" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
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
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [operators, setOperators] = useState<Array<{ _id: string; name: string }>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isManagerOrAdmin) return;
    api.listOperators().then((d) => setOperators(d.operators)).catch(() => {});
  }, [isManagerOrAdmin]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [status, priority, assignee]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = { limit: "30", page: String(page) };
    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (assignee) params.assignee = assignee;
    api
      .listTickets(params)
      .then((d) => { setTickets(d.tickets); setTotal(d.total); setPages(d.pages); })
      .catch((err: { message?: string }) => setError(err.message ?? "Не удалось загрузить заявки"))
      .finally(() => setLoading(false));
  }, [status, priority, assignee, page]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tickets;
    const q = search.trim().toLowerCase();
    return tickets.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.clientId?.name?.toLowerCase().includes(q) ||
        t.clientId?.company?.toLowerCase().includes(q)
    );
  }, [tickets, search]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Заявки</h1>
          <div className="text-xs text-slate-500 mt-0.5">{total} всего · стр. {page}/{pages}</div>
        </div>
        <Link
          href="/tickets/new"
          className="px-3 py-2 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
        >
          + Новая заявка
        </Link>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key || "all"}
              onClick={() => setStatus(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                status === f.key
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white"
          >
            {PRIORITY_FILTERS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>

          {isManagerOrAdmin && (
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white"
            >
              <option value="">Все исполнители</option>
              {operators.map((o) => (
                <option key={o._id} value={o._id}>{o.name}</option>
              ))}
            </select>
          )}

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по теме или клиенту…"
            className="flex-1 max-w-md px-3 py-1.5 rounded-md border border-slate-200 text-xs"
          />
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md mb-4">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-sm text-slate-400 text-center">Загрузка…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-slate-400 text-center">
            {search ? "Ничего не найдено по запросу" : "Нет заявок"}
          </div>
        ) : (
          filtered.map((t) => (
            <Link
              key={t._id}
              href={`/tickets/${t._id}`}
              className="block p-4 hover:bg-slate-50 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-40"
          >
            ← Назад
          </button>
          <span className="text-xs text-slate-500">{page} / {pages}</span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-40"
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
