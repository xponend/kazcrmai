"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../lib/api";

const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-300",
  in_progress: "bg-violet-500/20 text-violet-300",
  resolved: "bg-emerald-500/20 text-emerald-300",
  closed: "bg-neutral-700 text-neutral-300",
};
const PRIO_COLOR: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300",
  high: "bg-orange-500/20 text-orange-300",
  medium: "bg-amber-500/20 text-amber-300",
  low: "bg-neutral-800 text-neutral-300",
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<any | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI profile
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getClient(id), api.listTickets({ limit: "100" })])
      .then(([c, t]) => {
        setClient(c.client);
        setTickets(t.tickets.filter((x: any) => x.clientId?._id === id || x.clientId === id));
      })
      .catch((e: { message?: string }) => setError(e.message ?? "Не удалось загрузить"))
      .finally(() => setLoading(false));
  }, [id]);

  const loadProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try { setProfile(await api.aiClientProfile(id)); }
    catch (err) { setProfileError((err as { message?: string }).message ?? "Не удалось получить профиль"); }
    finally { setProfileLoading(false); }
  };

  if (loading) return <div className="p-8 text-sm text-neutral-500">Загрузка…</div>;
  if (error || !client) return <div className="p-8 text-sm text-red-300">{error ?? "Клиент не найден"}</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="text-xs text-neutral-400 hover:text-neutral-50">
        ← Назад
      </button>

      <div className="bg-[#161616] border border-neutral-800 rounded-xl p-6">
        <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
        <div className="text-sm text-neutral-400 mt-1">{client.company ?? "—"}</div>
        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div><div className="text-xs text-neutral-400">Email</div><div>{client.email ?? "—"}</div></div>
          <div><div className="text-xs text-neutral-400">Телефон</div><div>{client.phone ?? "—"}</div></div>
          <div><div className="text-xs text-neutral-400">Всего обращений</div><div className="font-semibold">{client.totalTickets ?? 0}</div></div>
        </div>
      </div>

      {/* AI profile */}
      <div className="bg-[#161616] border border-violet-500/30 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={14} strokeWidth={1.75} className="text-violet-400" />
            <span className="font-semibold text-violet-200">ИИ-портрет клиента</span>
          </div>
          {!profile && !profileLoading && (
            <button
              onClick={loadProfile}
              className="text-xs px-3 py-1.5 rounded-md border border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
            >
              Сгенерировать
            </button>
          )}
        </div>
        {profileLoading && <div className="text-sm text-violet-400 italic mt-3">Анализируем историю…</div>}
        {profileError && <div className="text-sm text-red-300 mt-3">{profileError}</div>}
        {profile && (
          <div className="space-y-3 mt-4 text-sm">
            <div>
              <div className="text-[10px] font-bold uppercase text-violet-300 mb-1">Портрет</div>
              <div className="text-neutral-200 leading-6">{profile.profile.persona}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-violet-300 mb-1">Тон общения</div>
              <div className="text-neutral-200">{profile.profile.toneAdvice}</div>
            </div>
            {profile.profile.recurringTopics?.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase text-violet-300 mb-1">Темы</div>
                <ul className="text-neutral-200">
                  {profile.profile.recurringTopics.map((t: string, i: number) => <li key={i}>• {t}</li>)}
                </ul>
              </div>
            )}
            {profile.profile.riskFlags?.length > 0 && (
              <div className="bg-amber-500/10 rounded-lg p-3">
                <div className="text-[10px] font-bold uppercase text-amber-300 mb-1">Риски</div>
                {profile.profile.riskFlags.map((r: string, i: number) => (
                  <div key={i} className="text-xs text-amber-200">⚠ {r}</div>
                ))}
              </div>
            )}
            <div className="text-[10px] text-neutral-500">по {profile.sampleSize} последним обращениям</div>
          </div>
        )}
      </div>

      {/* Tickets for this client */}
      <div>
        <div className="text-sm font-semibold text-neutral-200 mb-2">Заявки клиента ({tickets.length})</div>
        <div className="bg-[#161616] border border-neutral-800 rounded-xl divide-y divide-neutral-800">
          {tickets.length === 0 ? (
            <div className="p-6 text-sm text-neutral-500 text-center">Заявок нет</div>
          ) : (
            tickets.map((t) => (
              <Link
                key={t._id}
                href={`/tickets/${t._id}`}
                className="block p-4 hover:bg-[#0a0a0a] transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[t.status] ?? "bg-neutral-800"}`}>{t.status}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIO_COLOR[t.priority] ?? "bg-neutral-800"}`}>{t.priority}</span>
                  {(t.aiCategory || t.category) && (
                    <span className="text-[10px] text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded">{t.aiCategory ?? t.category}</span>
                  )}
                </div>
                <div className="text-sm font-medium">{t.title}</div>
                <div className="text-xs text-neutral-400 mt-0.5">{new Date(t.createdAt).toLocaleString("ru-RU")}</div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
