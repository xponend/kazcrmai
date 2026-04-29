"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, MessageSquare, Send } from "lucide-react";
import { api } from "../../../lib/api";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const QUICK = [
  "Сколько у нас открытых критических заявок?",
  "Что случилось за последние 24 часа?",
  "Какие категории чаще всего обращаются?",
  "Перечисли просроченные заявки",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState<{ total: number; open: number; critical: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text?: string) => {
    const message = (text ?? draft).trim();
    if (!message || sending) return;
    setDraft("");
    const userMsg: Msg = { id: String(Date.now()), role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const { reply, contextStats } = await api.chat(message, history);
      setStats(contextStats);
      setMessages((prev) => [...prev, { id: String(Date.now() + 1), role: "assistant", content: reply }]);
    } catch (err) {
      const e = err as { status?: number; message?: string };
      const errorText =
        e.status === 404
          ? "Чат пока не задеплоен на бэкенде."
          : e.message ?? "Не удалось получить ответ.";
      setMessages((prev) => [...prev, { id: String(Date.now() + 1), role: "assistant", content: errorText }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-4 bg-[#161616] border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Sparkles size={16} strokeWidth={1.75} className="text-violet-400" />
          <span className="font-semibold">ИИ-ассистент</span>
        </div>
        {stats && (
          <div className="text-xs text-neutral-400">
            {stats.total} заявок · {stats.open} откр. · {stats.critical} крит.
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="max-w-md mx-auto bg-[#161616] border border-violet-500/30 rounded-xl p-5 mt-12">
            <div className="text-center mb-3">
              <div className="grid place-items-center mb-2">
                <MessageSquare size={32} strokeWidth={1.5} className="text-violet-400" />
              </div>
              <div className="font-semibold">Спросите ассистента</div>
              <div className="text-xs text-neutral-400 mt-1">
                Я отвечаю на основе свежих данных по заявкам.
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs px-2.5 py-1 rounded-full border border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-6 ${
                m.role === "user"
                  ? "bg-violet-600 text-white rounded-br-sm"
                  : "bg-[#161616] border border-neutral-800 text-neutral-100 rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-2xl bg-[#161616] border border-neutral-800 text-neutral-500 text-sm italic">
              думаю…
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-[#161616] border-t border-neutral-800 flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Спросите про заявки…"
          disabled={sending}
          className="flex-1 px-4 py-2 rounded-2xl border border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 resize-none"
        />
        <button
          onClick={() => send()}
          disabled={!draft.trim() || sending}
          className="w-10 h-10 rounded-full bg-violet-600 text-white grid place-items-center disabled:opacity-50 hover:bg-violet-500"
        >
          <Send size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
