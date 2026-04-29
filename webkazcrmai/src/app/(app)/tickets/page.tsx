"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

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
  critical: "bg-red-500/20 text-red-300",
  high: "bg-orange-500/20 text-orange-300",
  medium: "bg-amber-500/20 text-amber-300",
  low: "bg-neutral-800 text-neutral-300",
};

const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-300",
  in_progress: "bg-violet-500/20 text-violet-300",
  resolved: "bg-emerald-500/20 text-emerald-300",
  closed: "bg-neutral-700 text-neutral-300",
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
          <div className="text-xs text-neutral-400 mt-0.5">{total} всего · стр. {page}/{pages}</div>
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
                  ? "bg-black text-white border-slate-900"
                  : "bg-[#161616] text-neutral-300 border-neutral-800 hover:bg-[#0a0a0a]"
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
            className="px-2 py-1.5 rounded-md border border-neutral-800 text-xs bg-[#161616]"
          >
            {PRIORITY_FILTERS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>

          {isManagerOrAdmin && (
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="px-2 py-1.5 rounded-md border border-neutral-800 text-xs bg-[#161616]"
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
            className="flex-1 max-w-md px-3 py-1.5 rounded-md border border-neutral-800 text-xs"
          />
        </div>
      </div>

      {error && <div className="bg-red-500/10 text-red-300 text-sm p-3 rounded-md mb-4">{error}</div>}

      <div className="bg-[#161616] border border-neutral-800 rounded-xl divide-y divide-neutral-800">
        {loading ? (
          <div className="p-8 text-sm text-neutral-500 text-center">Загрузка…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-neutral-500 text-center">
            {search ? "Ничего не найдено по запросу" : "Нет заявок"}
          </div>
        ) : (
          filtered.map((t) => (
            <Link
              key={t._id}
              href={`/tickets/${t._id}`}
              className="block p-4 hover:bg-[#0a0a0a] transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[t.status] ?? "bg-neutral-800"}`}>
                      {t.status}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIO_COLOR[t.priority] ?? "bg-neutral-800"}`}>
                      {t.priority}
                    </span>
                    {(t.aiCategory || t.category) && (
                      <span className="text-[10px] text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded">
                        {t.aiCategory ?? t.category}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-neutral-50 truncate">{t.title}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">
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
            className="text-xs px-3 py-1.5 rounded-md border border-neutral-800 disabled:opacity-40"
          >
            ← Назад
          </button>
          <span className="text-xs text-neutral-400">{page} / {pages}</span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="text-xs px-3 py-1.5 rounded-md border border-neutral-800 disabled:opacity-40"
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
