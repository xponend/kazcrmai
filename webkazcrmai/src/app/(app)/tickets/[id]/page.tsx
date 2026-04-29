"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth";

const NEXT_STATUS: Record<string, string> = {
  new: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
};
const STATUS_LABEL: Record<string, string> = {
  new: "Взять в работу",
  in_progress: "Решить",
  resolved: "Закрыть",
};

type AssistTab = "reply" | "summary" | "similar" | "playbook" | null;

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";
  const [ticket, setTicket] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operators, setOperators] = useState<Array<{ _id: string; name: string }>>([]);
  const [updating, setUpdating] = useState(false);

  // AI panels
  const [tab, setTab] = useState<AssistTab>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [replies, setReplies] = useState<Array<{ tone: string; body: string }> | null>(null);
  const [summary, setSummary] = useState<{ summary: string; keyPoints: string[] } | null>(null);
  const [similar, setSimilar] = useState<any[] | null>(null);
  const [playbook, setPlaybook] = useState<any | null>(null);

  // Translation
  const [trLang, setTrLang] = useState<"ru" | "kk" | "en" | null>(null);
  const [trText, setTrText] = useState<{ title: string; description: string } | null>(null);
  const [trLoading, setTrLoading] = useState(false);

  // Comment
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSending, setCommentSending] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { ticket, history } = await api.getTicket(id);
      setTicket(ticket);
      setHistory(history);
    } catch (err) {
      setError((err as { message?: string }).message ?? "Не удалось загрузить заявку");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!isManagerOrAdmin) return;
    api.listOperators().then((d) => setOperators(d.operators)).catch(() => {});
  }, [isManagerOrAdmin]);

  const reassign = async (assigneeId: string) => {
    if (!ticket || updating) return;
    if (assigneeId === String(ticket.assigneeId?._id ?? ticket.assigneeId ?? "")) return;
    setUpdating(true);
    try {
      await api.updateTicket(id, { assigneeId });
      await load();
    } catch (err) {
      alert((err as { message?: string }).message ?? "Не удалось переназначить");
    } finally {
      setUpdating(false);
    }
  };

  const setPriority = async (priority: string) => {
    if (!ticket || updating || priority === ticket.priority) return;
    setUpdating(true);
    try {
      await api.updateTicket(id, { priority });
      await load();
    } catch (err) {
      alert((err as { message?: string }).message ?? "Не удалось изменить приоритет");
    } finally {
      setUpdating(false);
    }
  };

  const advance = async () => {
    if (!ticket) return;
    const next = NEXT_STATUS[ticket.status];
    if (!next) return;
    try {
      await api.updateTicket(id, { status: next });
      await load();
    } catch (err) {
      alert((err as { message?: string }).message ?? "Не удалось обновить");
    }
  };

  const openTab = async (next: AssistTab) => {
    if (next === tab) {
      setTab(null);
      return;
    }
    setTab(next);
    setAiError(null);
    if (next === "reply" && !replies) {
      setAiLoading(true);
      try { setReplies((await api.aiSuggestReply(id)).suggestions); }
      catch (err) { setAiError((err as { message?: string }).message ?? "Не удалось получить ответы"); }
      finally { setAiLoading(false); }
    } else if (next === "summary" && !summary) {
      setAiLoading(true);
      try { setSummary(await api.aiSummarize(id)); }
      catch (err) { setAiError((err as { message?: string }).message ?? "Не удалось получить саммари"); }
      finally { setAiLoading(false); }
    } else if (next === "similar" && !similar) {
      setAiLoading(true);
      try { setSimilar((await api.aiSimilar(id)).similar); }
      catch (err) { setAiError((err as { message?: string }).message ?? "Не удалось найти похожие"); }
      finally { setAiLoading(false); }
    } else if (next === "playbook" && !playbook) {
      setAiLoading(true);
      try { setPlaybook(await api.aiPlaybook(id)); }
      catch (err) { setAiError((err as { message?: string }).message ?? "Не удалось получить план"); }
      finally { setAiLoading(false); }
    }
  };

  const translate = async (to: "ru" | "kk" | "en") => {
    if (trLang === to) {
      setTrLang(null);
      setTrText(null);
      return;
    }
    setTrLoading(true);
    try {
      const r = await api.aiTranslate(id, to);
      setTrLang(to);
      setTrText({ title: r.title, description: r.description });
    } catch (err) {
      alert((err as { message?: string }).message ?? "Перевод недоступен");
    } finally {
      setTrLoading(false);
    }
  };

  const submitComment = async () => {
    const text = commentDraft.trim();
    if (!text || commentSending) return;
    setCommentSending(true);
    try {
      await api.addComment(id, text);
      setCommentDraft("");
      await load();
    } catch (err) {
      alert((err as { message?: string }).message ?? "Не удалось добавить комментарий");
    } finally {
      setCommentSending(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-slate-400">Загрузка…</div>;
  if (error || !ticket) return <div className="p-8 text-sm text-red-600">{error ?? "Заявка не найдена"}</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="text-xs text-slate-500 hover:text-slate-900">
        ← Назад
      </button>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100">{ticket.status}</span>
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{ticket.priority}</span>
          {(ticket.aiCategory || ticket.category) && (
            <span className="text-[10px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
              {ticket.aiCategory ?? ticket.category}
            </span>
          )}
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{trText?.title ?? ticket.title}</h1>

        <div className="flex items-center justify-between gap-2 mt-4">
          <div className="text-xs text-slate-500">
            {ticket.clientId?.name ?? "—"}
            {ticket.assigneeId?.name ? ` · 👤 ${ticket.assigneeId.name}` : " · не назначен"}
          </div>
          <div className="flex gap-1">
            {(["ru", "kk", "en"] as const).map((l) => (
              <button
                key={l}
                disabled={trLoading}
                onClick={() => translate(l)}
                className={`text-[10px] font-bold px-2 py-1 rounded border ${
                  trLang === l ? "bg-violet-600 text-white border-violet-600" : "border-violet-200 text-violet-700"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {trLoading && <div className="text-xs text-violet-600 italic mt-3">Переводим…</div>}

        <p className="text-sm text-slate-700 mt-4 whitespace-pre-wrap leading-6">
          {trText?.description ?? ticket.description}
        </p>

        {ticket.aiReason && (
          <div className="mt-5 text-xs text-slate-500 italic border-l-2 border-violet-200 pl-3">
            ✨ {ticket.aiReason}
          </div>
        )}

        {NEXT_STATUS[ticket.status] && (
          <button
            onClick={advance}
            className="mt-5 w-full py-2.5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            {STATUS_LABEL[ticket.status]}
          </button>
        )}

        {isManagerOrAdmin && (
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
            <label>
              <span className="text-slate-500">Исполнитель</span>
              <select
                value={String(ticket.assigneeId?._id ?? ticket.assigneeId ?? "")}
                onChange={(e) => reassign(e.target.value)}
                disabled={updating}
                className="mt-1 w-full px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white"
              >
                <option value="">— не назначен —</option>
                {operators.map((o) => (
                  <option key={o._id} value={o._id}>{o.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-slate-500">Приоритет</span>
              <select
                value={ticket.priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={updating}
                className="mt-1 w-full px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {/* AI assist */}
      <div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: "reply", label: "Ответ", icon: "💬" },
            { key: "summary", label: "Саммари", icon: "📝" },
            { key: "similar", label: "Похожие", icon: "🔁" },
            { key: "playbook", label: "План", icon: "📋" },
          ].map((b) => (
            <button
              key={b.key}
              onClick={() => openTab(b.key as AssistTab)}
              className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 transition ${
                tab === b.key
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white border-violet-200 text-violet-700 hover:bg-violet-50"
              }`}
            >
              <span>{b.icon}</span> {b.label}
            </button>
          ))}
        </div>

        {tab && (
          <div className="mt-3 bg-white border border-slate-200 rounded-xl p-5 text-sm">
            {aiLoading && <div className="text-violet-600 italic">Генерируется…</div>}
            {aiError && <div className="text-red-600">{aiError}</div>}

            {!aiLoading && !aiError && tab === "reply" && replies && (
              <div className="space-y-3">
                {replies.map((r, i) => (
                  <div key={i} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                    <div className="text-[10px] font-bold uppercase text-violet-700 mb-1.5">{r.tone}</div>
                    <div className="text-slate-700 leading-6">{r.body}</div>
                  </div>
                ))}
              </div>
            )}

            {!aiLoading && !aiError && tab === "summary" && summary && (
              <div>
                <div className="font-semibold mb-2">{summary.summary}</div>
                <ul className="space-y-1 text-slate-600">
                  {summary.keyPoints.map((p, i) => <li key={i}>• {p}</li>)}
                </ul>
              </div>
            )}

            {!aiLoading && !aiError && tab === "similar" && similar && (
              similar.length === 0 ? (
                <div className="text-slate-400 italic">Похожих заявок не найдено</div>
              ) : (
                <ul className="space-y-2">
                  {similar.map((t) => (
                    <li key={t._id} className="border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                      <div className="font-medium text-slate-700">{t.title}</div>
                      <div className="text-xs text-slate-500">[{t.aiCategory ?? t.category ?? "—"}] · {t.status}</div>
                    </li>
                  ))}
                </ul>
              )
            )}

            {!aiLoading && !aiError && tab === "playbook" && playbook && (
              <div className="space-y-3">
                {playbook.estimatedMinutes > 0 && (
                  <div className="text-xs font-semibold text-violet-700">
                    ≈ {playbook.estimatedMinutes} мин · {playbook.similarCount} похожих в истории
                  </div>
                )}
                {playbook.steps.map((s: any) => (
                  <div key={s.index} className="flex gap-3 border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                    <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold grid place-items-center shrink-0">
                      {s.index}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{s.action}</div>
                      <div className="text-slate-600 text-sm">{s.detail}</div>
                    </div>
                  </div>
                ))}
                {playbook.escalateIf?.length > 0 && (
                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="text-[10px] font-bold uppercase text-amber-800 mb-1">Эскалировать, если</div>
                    {playbook.escalateIf.map((e: string, i: number) => (
                      <div key={i} className="text-xs text-amber-900">⚠ {e}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="text-sm font-semibold mb-4">История</div>
        <div className="space-y-4">
          {history.map((h, i) => (
            <div key={h._id || i} className="flex gap-3">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                h.action === "comment" ? "bg-emerald-500" : "bg-violet-600"
              }`} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-800">
                  {h.action === "created" && "Заявка создана"}
                  {h.action === "status_changed" && `Статус: ${h.oldValue} → ${h.newValue}`}
                  {h.action === "assigned" && "Назначен исполнитель"}
                  {h.action === "ai_processed" && "ИИ-анализ выполнен"}
                  {h.action === "priority_changed" && `Приоритет: ${h.oldValue} → ${h.newValue}`}
                  {h.action === "comment" && "Комментарий"}
                </div>
                {h.comment && <div className="text-sm text-slate-700 mt-0.5 leading-5">{h.comment}</div>}
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(h.createdAt).toLocaleString("ru-RU")}
                  {h.performedBy?.name ? ` · ${h.performedBy.name}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
          <textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="Добавить комментарий…"
            disabled={commentSending}
            rows={2}
            className="flex-1 px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
          <button
            onClick={submitComment}
            disabled={!commentDraft.trim() || commentSending}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 self-start"
          >
            {commentSending ? "…" : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}
