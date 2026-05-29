"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LogOut, Sparkles } from "lucide-react";
import { api, tokenStore } from "../../../lib/api";
import { statusLabel, priorityLabel, categoryLabel } from "../../../lib/i18n";

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

export default function PortalPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("");

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

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
    setUserName(u.name ?? "");
    setReady(true);
  }, [router]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await api.listTickets({ limit: "100" });
      setTickets(data.tickets ?? []);
    } catch (err) {
      setListError((err as { message?: string }).message ?? "Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) loadTickets();
  }, [ready, loadTickets]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setAiNotice(null);
    setSubmitting(true);
    try {
      // Backend derives clientId from the client account; we pass it only to satisfy the TS signature.
      const clientId = tokenStore.getUser()?.clientId ?? "";
      const r = await api.createTicket({ title: title.trim(), description: description.trim(), clientId });
      setTitle("");
      setDescription("");
      if (r.aiFailed) {
        setAiNotice("Заявка создана. ИИ-классификация будет выполнена чуть позже.");
      }
      await loadTickets();
    } catch (err) {
      setFormError((err as { message?: string }).message ?? "Не удалось создать заявку");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await api.logout();
    router.push("/landing/login");
  };

  if (!ready) {
    return <div className="p-8 text-sm text-neutral-500">Загрузка…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Здравствуйте{userName ? `, ${userName.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">Ваши обращения в поддержку</p>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-neutral-50 border border-neutral-800 rounded-md px-3 py-2 hover:bg-[#161616] transition"
        >
          <LogOut size={13} strokeWidth={2} /> Выйти
        </button>
      </header>

      {/* New ticket */}
      <form onSubmit={submit} className="space-y-3 bg-[#161616] border border-neutral-800 rounded-xl p-5">
        <div className="text-sm font-semibold text-neutral-100 flex items-center gap-1.5">
          <Plus size={15} strokeWidth={2} /> Новая заявка
        </div>
        <label className="block">
          <span className="text-xs font-medium text-neutral-300">Заголовок</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Кратко опишите проблему"
            className="mt-1 w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-neutral-300">Описание</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="Подробно опишите ситуацию"
            className="mt-1 w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 resize-y"
          />
        </label>

        {formError && <p className="text-sm text-red-400">{formError}</p>}
        {aiNotice && <p className="text-sm text-amber-300">{aiNotice}</p>}

        <button
          type="submit"
          disabled={submitting || !title.trim() || !description.trim()}
          className="w-full py-2.5 rounded-md bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
        >
          {submitting ? (
            "Создаём заявку…"
          ) : (
            <>
              <Sparkles size={14} strokeWidth={1.75} /> Отправить заявку
            </>
          )}
        </button>
      </form>

      {/* Ticket list */}
      <div className="bg-[#161616] border border-neutral-800 rounded-xl">
        <div className="px-5 py-4 border-b border-neutral-800">
          <div className="font-semibold text-neutral-100">Мои заявки</div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {tickets.length > 0 ? `Всего: ${tickets.length}` : "История обращений"}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-neutral-500 text-center">Загрузка…</div>
        ) : listError ? (
          <div className="p-8 text-sm text-red-400 text-center">{listError}</div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-sm text-neutral-300 font-medium">Пока нет заявок</div>
            <div className="text-xs text-neutral-500 mt-1">
              Создайте первую заявку с помощью формы выше — мы ответим как можно скорее.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {tickets.map((t) => (
              <Link
                key={t._id}
                href={`/landing/portal/${t._id}`}
                className="block px-5 py-3.5 hover:bg-neutral-900 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[t.status] ?? "bg-neutral-700"}`}>
                        {statusLabel(t.status)}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIO_COLOR[t.priority] ?? "bg-neutral-700"}`}>
                        {priorityLabel(t.priority)}
                      </span>
                      {(t.aiCategory || t.category) && (
                        <span className="text-[10px] text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded">
                          {categoryLabel(t.aiCategory ?? t.category)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-neutral-100 truncate">{t.title}</div>
                  </div>
                  <div className="text-[11px] text-neutral-500 whitespace-nowrap">
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString("ru-RU") : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
