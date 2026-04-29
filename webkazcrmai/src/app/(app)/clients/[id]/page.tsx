"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../lib/api";

const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-violet-100 text-violet-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-200 text-slate-600",
};
const PRIO_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
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

  if (loading) return <div className="p-8 text-sm text-slate-400">Загрузка…</div>;
  if (error || !client) return <div className="p-8 text-sm text-red-600">{error ?? "Клиент не найден"}</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="text-xs text-slate-500 hover:text-slate-900">
        ← Назад
      </button>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
        <div className="text-sm text-slate-500 mt-1">{client.company ?? "—"}</div>
        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div><div className="text-xs text-slate-500">Email</div><div>{client.email ?? "—"}</div></div>
          <div><div className="text-xs text-slate-500">Телефон</div><div>{client.phone ?? "—"}</div></div>
          <div><div className="text-xs text-slate-500">Всего обращений</div><div className="font-semibold">{client.totalTickets ?? 0}</div></div>
        </div>
      </div>

      {/* AI profile */}
      <div className="bg-white border border-violet-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-violet-600">✨</span>
            <span className="font-semibold text-violet-800">ИИ-портрет клиента</span>
          </div>
          {!profile && !profileLoading && (
            <button
              onClick={loadProfile}
              className="text-xs px-3 py-1.5 rounded-md border border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              Сгенерировать
            </button>
          )}
        </div>
        {profileLoading && <div className="text-sm text-violet-600 italic mt-3">Анализируем историю…</div>}
        {profileError && <div className="text-sm text-red-600 mt-3">{profileError}</div>}
        {profile && (
          <div className="space-y-3 mt-4 text-sm">
            <div>
              <div className="text-[10px] font-bold uppercase text-violet-700 mb-1">Портрет</div>
              <div className="text-slate-700 leading-6">{profile.profile.persona}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-violet-700 mb-1">Тон общения</div>
              <div className="text-slate-700">{profile.profile.toneAdvice}</div>
            </div>
            {profile.profile.recurringTopics?.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase text-violet-700 mb-1">Темы</div>
                <ul className="text-slate-700">
                  {profile.profile.recurringTopics.map((t: string, i: number) => <li key={i}>• {t}</li>)}
                </ul>
              </div>
            )}
            {profile.profile.riskFlags?.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-[10px] font-bold uppercase text-amber-800 mb-1">Риски</div>
                {profile.profile.riskFlags.map((r: string, i: number) => (
                  <div key={i} className="text-xs text-amber-900">⚠ {r}</div>
                ))}
              </div>
            )}
            <div className="text-[10px] text-slate-400">по {profile.sampleSize} последним обращениям</div>
          </div>
        )}
      </div>

      {/* Tickets for this client */}
      <div>
        <div className="text-sm font-semibold text-slate-700 mb-2">Заявки клиента ({tickets.length})</div>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {tickets.length === 0 ? (
            <div className="p-6 text-sm text-slate-400 text-center">Заявок нет</div>
          ) : (
            tickets.map((t) => (
              <Link
                key={t._id}
                href={`/tickets/${t._id}`}
                className="block p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[t.status] ?? "bg-slate-100"}`}>{t.status}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIO_COLOR[t.priority] ?? "bg-slate-100"}`}>{t.priority}</span>
                  {(t.aiCategory || t.category) && (
                    <span className="text-[10px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">{t.aiCategory ?? t.category}</span>
                  )}
                </div>
                <div className="text-sm font-medium">{t.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{new Date(t.createdAt).toLocaleString("ru-RU")}</div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
