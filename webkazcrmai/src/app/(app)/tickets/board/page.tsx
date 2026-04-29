"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth";

type TicketRow = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  aiCategory?: string;
  category?: string;
  clientId?: { name?: string };
  assigneeId?: { name?: string };
  createdAt?: string;
};

const COLUMNS: Array<{ key: string; label: string; accent: string }> = [
  { key: "new", label: "Новые", accent: "border-blue-500/40 text-blue-300" },
  { key: "in_progress", label: "В работе", accent: "border-violet-500/40 text-violet-300" },
  { key: "resolved", label: "Решённые", accent: "border-emerald-500/40 text-emerald-300" },
  { key: "closed", label: "Закрытые", accent: "border-neutral-600 text-neutral-400" },
];

const PRIO_COLOR: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300",
  high: "bg-orange-500/20 text-orange-300",
  medium: "bg-amber-500/20 text-amber-300",
  low: "bg-neutral-500/20 text-neutral-400",
};

export default function KanbanBoardPage() {
  const { user } = useAuth();
  const isPrivileged = user?.role === "admin" || user?.role === "manager";
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.listTickets({ limit: "100" });
      setTickets(d.tickets);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const ticket = tickets.find((t) => t._id === id);
    if (!ticket || ticket.status === status) return;
    if (!isPrivileged && status !== "in_progress" && status !== "resolved" && status !== "closed") return;

    // Optimistic
    setTickets((prev) => prev.map((t) => (t._id === id ? { ...t, status } : t)));
    setPending(id);
    try {
      await api.updateTicket(id, { status });
    } catch (err) {
      alert((err as { message?: string }).message ?? "Не удалось переместить");
      load();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-4 h-full flex flex-col">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/tickets" className="text-xs text-neutral-400 hover:text-neutral-50 inline-flex items-center gap-1">
            <ArrowLeft size={12} strokeWidth={2} /> Список
          </Link>
          <h1 className="text-2xl font-semibold text-neutral-50">Kanban-доска</h1>
        </div>
        <Link
          href="/tickets/new"
          className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium inline-flex items-center gap-1.5"
        >
          <Plus size={14} strokeWidth={2} /> Новая заявка
        </Link>
      </header>

      {loading ? (
        <div className="text-sm text-neutral-500">Загрузка…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 min-h-0">
          {COLUMNS.map((col) => {
            const items = tickets.filter((t) => t.status === col.key);
            const isDragOver = dragOver === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(col.key);
                }}
                onDragLeave={() => setDragOver((c) => (c === col.key ? null : c))}
                onDrop={(e) => onDrop(e, col.key)}
                className={`flex flex-col bg-[#0d0d0d] rounded-xl border ${
                  isDragOver ? "border-violet-500" : "border-neutral-800"
                } min-h-0`}
              >
                <div className={`px-4 py-3 border-b ${col.accent} border-b-neutral-800 flex items-center justify-between`}>
                  <div className="text-sm font-semibold tracking-wide uppercase">{col.label}</div>
                  <span className="text-xs text-neutral-500 font-mono">{items.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {items.length === 0 ? (
                    <div className="text-xs text-neutral-600 text-center py-8 italic">пусто</div>
                  ) : (
                    items.map((t) => (
                      <div
                        key={t._id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", t._id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className={`group bg-[#161616] border border-neutral-800 hover:border-neutral-700 rounded-lg p-3 cursor-grab active:cursor-grabbing transition ${
                          pending === t._id ? "opacity-50" : ""
                        }`}
                      >
                        <Link href={`/tickets/${t._id}`} className="block">
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIO_COLOR[t.priority] ?? "bg-neutral-700"}`}>
                              {t.priority}
                            </span>
                            {(t.aiCategory || t.category) && (
                              <span className="text-[10px] text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded">
                                {t.aiCategory ?? t.category}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium text-neutral-100 line-clamp-2 leading-5">{t.title}</div>
                          <div className="text-[11px] text-neutral-500 mt-1.5 truncate">
                            {t.clientId?.name ?? "—"}
                            {t.assigneeId?.name ? ` · ${t.assigneeId.name}` : ""}
                          </div>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
