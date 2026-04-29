"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

const WINDOWS = [
  { hours: 24, label: "24ч" },
  { hours: 24 * 7, label: "7д" },
  { hours: 24 * 30, label: "30д" },
];

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${accent ? "bg-violet-500/10 border-violet-500/30" : "bg-[#161616] border-neutral-800"}`}>
      <div className={`text-2xl font-bold ${accent ? "text-violet-300" : "text-neutral-50"}`}>{value}</div>
      <div className="text-xs text-neutral-400 mt-0.5">{label}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [digest, setDigest] = useState<any | null>(null);
  const [hours, setHours] = useState(24);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestUnavailable, setDigestUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.analytics().then(setAnalytics).catch((e) => setError(e.message ?? "load failed"));
  }, []);

  useEffect(() => {
    setDigestLoading(true);
    api
      .digest(hours)
      .then((d) => { setDigest(d); setDigestUnavailable(false); })
      .catch((err: { status?: number }) => {
        if (err.status === 403 || err.status === 404) setDigestUnavailable(true);
      })
      .finally(() => setDigestLoading(false));
  }, [hours]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Аналитика</h1>

      {error && <div className="bg-red-500/10 text-red-300 text-sm p-3 rounded-md">{error}</div>}

      {!digestUnavailable && (
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-violet-400">✨</span>
              <span className="font-semibold text-violet-200">ИИ-дайджест</span>
            </div>
            <div className="flex gap-1">
              {WINDOWS.map((w) => (
                <button
                  key={w.hours}
                  onClick={() => setHours(w.hours)}
                  className={`text-[10px] font-bold px-2 py-1 rounded border ${
                    hours === w.hours ? "bg-violet-600 text-white border-violet-600" : "border-violet-500/30 text-violet-300 bg-[#161616]"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {digestLoading && <div className="text-sm text-violet-400 italic">Анализируем…</div>}
          {!digestLoading && digest && (
            <>
              {digest.headline && <div className="font-semibold text-neutral-100 mb-3 leading-6">{digest.headline}</div>}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <Stat label="Всего" value={digest.totalTickets} accent />
                <Stat label="Новые" value={digest.newTickets} accent />
                <Stat label="Решено" value={digest.resolvedTickets} accent />
                <Stat label="Ср. время" value={`${Math.round(digest.avgResolutionMins)}м`} accent />
              </div>
              {digest.insights?.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-bold uppercase text-violet-300 mb-1">Инсайты</div>
                  <ul className="text-sm text-neutral-200 space-y-1">
                    {digest.insights.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
              {digest.recommendations?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-violet-300 mb-1">Рекомендации</div>
                  <ul className="text-sm text-emerald-300 space-y-1">
                    {digest.recommendations.map((s: string, i: number) => <li key={i}>→ {s}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {analytics && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Всего заявок" value={analytics.totalTickets} />
            <Stat label="Открытые" value={analytics.openTickets} />
            <Stat label="Решённые" value={analytics.resolvedTickets} />
            <Stat label="Ср. обработка" value={`${analytics.avgProcessingMins}м`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#161616] border border-neutral-800 rounded-xl p-5">
              <div className="text-sm font-semibold mb-3">По категориям</div>
              <ul className="space-y-1">
                {(analytics.byCategory ?? []).map((c: any) => (
                  <li key={c._id} className="flex justify-between text-sm">
                    <span className="text-neutral-200">{c._id ?? "—"}</span>
                    <span className="font-mono text-neutral-400">{c.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#161616] border border-neutral-800 rounded-xl p-5">
              <div className="text-sm font-semibold mb-3">Нагрузка операторов</div>
              <ul className="space-y-1">
                {(analytics.operatorLoad ?? []).map((o: any) => (
                  <li key={o._id} className="flex justify-between text-sm">
                    <span className="text-neutral-200">{o.name}</span>
                    <span className="font-mono text-neutral-400">{o.currentLoad}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
