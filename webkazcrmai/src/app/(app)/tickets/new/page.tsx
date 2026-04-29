"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../lib/api";

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live AI preview
  const [preview, setPreview] = useState<any | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);

  useEffect(() => {
    api.listClients().then((d) => {
      setClients(d.clients);
      if (d.clients.length > 0) setClientId(d.clients[0]._id);
    });
  }, []);

  useEffect(() => {
    if (previewUnavailable) return;
    if (title.trim().length < 8 || description.trim().length < 20) {
      setPreview(null);
      return;
    }
    const t = setTimeout(async () => {
      setPreviewing(true);
      try { setPreview(await api.aiPreview({ title, description })); }
      catch (err) {
        if ((err as { status?: number }).status === 404) setPreviewUnavailable(true);
      } finally { setPreviewing(false); }
    }, 1500);
    return () => clearTimeout(t);
  }, [title, description, previewUnavailable]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await api.createTicket({ title, description, clientId });
      router.replace(`/tickets/${r.ticket._id}`);
    } catch (err) {
      setError((err as { message?: string }).message ?? "Не удалось создать заявку");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Новая заявка</h1>
      <form onSubmit={submit} className="space-y-4 bg-[#161616] border border-neutral-800 rounded-xl p-6">
        <label className="block">
          <span className="text-xs font-medium text-neutral-300">Клиент</span>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
            required
          >
            {clients.map((c) => (
              <option key={c._id} value={c._id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-neutral-300">Тема</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full px-3 py-2 rounded-md border border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-neutral-300">Описание</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={6}
            className="mt-1 w-full px-3 py-2 rounded-md border border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
          />
        </label>

        {(previewing || preview) && !previewUnavailable && (
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 text-sm">
            <div className="text-[10px] font-bold uppercase text-violet-300 mb-1">
              ✨ ИИ предсказывает {previewing && <span className="italic font-normal">— анализирует…</span>}
            </div>
            {preview && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-neutral-400">Категория:</span>{" "}
                  <span className="font-semibold">{preview.classification.category}</span>{" "}
                  <span className="text-neutral-500">({Math.round(preview.classification.confidence * 100)}%)</span>
                </div>
                <div>
                  <span className="text-neutral-400">Приоритет:</span>{" "}
                  <span className={`font-semibold ${preview.priority.priority === "critical" ? "text-red-300" : preview.priority.priority === "high" ? "text-amber-600" : "text-neutral-200"}`}>
                    {preview.priority.priority}
                  </span>{" "}
                  <span className="text-neutral-500">({preview.priority.score}/100)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <div className="text-sm text-red-300">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-md bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60"
        >
          {submitting ? "Создаём и запускаем ИИ-анализ…" : "✨ Создать заявку"}
        </button>
      </form>
    </div>
  );
}
