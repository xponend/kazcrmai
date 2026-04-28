"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // AI profile dialog
  const [activeId, setActiveId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api
        .listClients(search || undefined)
        .then((d) => setClients(d.clients))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const openProfile = async (id: string) => {
    setActiveId(id);
    setProfile(null);
    setProfileError(null);
    setProfileLoading(true);
    try {
      const r = await api.aiClientProfile(id);
      setProfile(r);
    } catch (err) {
      setProfileError((err as { message?: string }).message ?? "Не удалось получить профиль");
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Клиенты</h1>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по имени или компании…"
        className="w-full max-w-md px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      />

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {loading ? (
          <div className="p-6 text-sm text-slate-400 text-center">Загрузка…</div>
        ) : clients.length === 0 ? (
          <div className="p-6 text-sm text-slate-400 text-center">Не найдено</div>
        ) : (
          clients.map((c) => (
            <div key={c._id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-slate-800">{c.name}</div>
                <div className="text-xs text-slate-500">{c.company ?? "—"} · {c.totalTickets ?? 0} обращений</div>
              </div>
              <button
                onClick={() => openProfile(c._id)}
                className="text-xs px-2.5 py-1 rounded-md border border-violet-200 text-violet-700 hover:bg-violet-50 whitespace-nowrap"
              >
                ✨ ИИ-профиль
              </button>
            </div>
          ))
        )}
      </div>

      {activeId && (
        <div className="fixed inset-0 bg-slate-900/40 grid place-items-center p-4 z-50" onClick={() => setActiveId(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">ИИ-профиль клиента</div>
              <button onClick={() => setActiveId(null)} className="text-slate-400">✕</button>
            </div>
            {profileLoading && <div className="text-sm text-violet-600 italic">Анализируем историю…</div>}
            {profileError && <div className="text-sm text-red-600">{profileError}</div>}
            {profile && (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[10px] font-bold uppercase text-violet-700">Портрет</div>
                  <div className="text-slate-700 leading-6">{profile.profile.persona}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-violet-700">Тон общения</div>
                  <div className="text-slate-700">{profile.profile.toneAdvice}</div>
                </div>
                {profile.profile.recurringTopics?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase text-violet-700">Темы</div>
                    <ul className="text-slate-700 space-y-0.5">
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
        </div>
      )}
    </div>
  );
}
