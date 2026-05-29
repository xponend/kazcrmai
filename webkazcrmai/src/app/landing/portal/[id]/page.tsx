"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { api, tokenStore } from "../../../../lib/api";
import { statusLabel, priorityLabel, categoryLabel } from "../../../../lib/i18n";

const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-300",
  in_progress: "bg-violet-500/20 text-violet-300",
  resolved: "bg-emerald-500/20 text-emerald-300",
  closed: "bg-neutral-500/20 text-neutral-400",
};
const PRIO_COLOR: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300",
  high: "bg-orange-500/20 text-orange-300",
  medium: "bg-amber-500/20 text-amber-300",
  low: "bg-neutral-500/20 text-neutral-400",
};

export default function PortalTicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentDraft, setCommentDraft] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Auth gate — client-role only.
  useEffect(() => {
    if (!tokenStore.getAccess()) {
      router.replace("/landing/login");
      return;
    }
    const u = tokenStore.getUser();
    if (!u || u.role !== "client") {
      router.replace("/landing/login");
      return;
    }
    setReady(true);
  }, [router]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const { ticket, history } = await api.getTicket(id);
        setTicket(ticket);
        setHistory(history);
      } catch (err) {
        if (!silent) setError((err as { message?: string }).message ?? "Не удалось загрузить заявку");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const submitComment = async () => {
    const text = commentDraft.trim();
    if (!text || commentSending) return;
    setCommentSending(true);
    setCommentError(null);
    try {
      await api.addComment(id, text);
      setCommentDraft("");
      await load(true);
    } catch (err) {
      setCommentError((err as { message?: string }).message ?? "Не удалось добавить комментарий");
    } finally {
      setCommentSending(false);
    }
  };

  if (!ready || loading) return <div className="p-8 text-sm text-neutral-500">Загрузка…</div>;
  if (error || !ticket)
    return <div className="p-8 text-sm text-red-400">{error ?? "Заявка не найдена"}</div>;

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      <button
        onClick={() => router.push("/landing/portal")}
        className="text-xs text-neutral-400 hover:text-neutral-50 inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} strokeWidth={2} /> К списку заявок
      </button>

      <div className="bg-[#161616] border border-neutral-800 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[ticket.status] ?? "bg-neutral-700"}`}>
            {statusLabel(ticket.status)}
          </span>
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIO_COLOR[ticket.priority] ?? "bg-neutral-700"}`}>
            {priorityLabel(ticket.priority)}
          </span>
          {(ticket.aiCategory || ticket.category) && (
            <span className="text-[10px] text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded">
              {categoryLabel(ticket.aiCategory ?? ticket.category)}
            </span>
          )}
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-50">{ticket.title}</h1>
        <div className="text-xs text-neutral-500 mt-1">
          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("ru-RU") : ""}
        </div>
        <p className="text-sm text-neutral-200 mt-4 whitespace-pre-wrap leading-6">
          {ticket.description}
        </p>
      </div>

      {/* Timeline */}
      <div className="bg-[#161616] border border-neutral-800 rounded-xl p-4 sm:p-6">
        <div className="text-sm font-semibold mb-4 text-neutral-100">История</div>
        {history.length === 0 ? (
          <div className="text-sm text-neutral-500 italic">Пока нет событий</div>
        ) : (
          <div className="space-y-4">
            {history.map((h, i) => (
              <div key={h._id || i} className="flex gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    h.action === "comment" ? "bg-emerald-500" : "bg-violet-600"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-neutral-100">
                    {h.action === "created" && "Заявка создана"}
                    {h.action === "status_changed" &&
                      `Статус: ${statusLabel(h.oldValue)} → ${statusLabel(h.newValue)}`}
                    {h.action === "assigned" && "Назначен специалист"}
                    {h.action === "ai_processed" && "ИИ-анализ выполнен"}
                    {h.action === "priority_changed" &&
                      `Приоритет: ${priorityLabel(h.oldValue)} → ${priorityLabel(h.newValue)}`}
                    {h.action === "comment" && "Комментарий"}
                  </div>
                  {h.comment && (
                    <div className="text-sm text-neutral-200 mt-0.5 leading-5">{h.comment}</div>
                  )}
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    {h.createdAt ? new Date(h.createdAt).toLocaleString("ru-RU") : ""}
                    {h.performedBy?.name ? ` · ${h.performedBy.name}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {commentError && <p className="text-sm text-red-400 mt-4">{commentError}</p>}

        <div className="flex flex-col sm:flex-row gap-2 mt-5 pt-4 border-t border-neutral-800">
          <textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="Добавить комментарий или уточнение…"
            disabled={commentSending}
            rows={2}
            className="flex-1 px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 resize-none"
          />
          <button
            onClick={submitComment}
            disabled={!commentDraft.trim() || commentSending}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 sm:self-start inline-flex items-center justify-center gap-1.5"
          >
            <Send size={13} strokeWidth={2} />
            {commentSending ? "…" : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}
