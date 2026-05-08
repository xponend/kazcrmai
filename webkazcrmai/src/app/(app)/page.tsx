"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Ticket,
  Flame,
  Clock,
  Sparkles,
  Building2,
  Users,
  CheckCircle2,
  Tag,
  ArrowRight,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { statusLabel, priorityLabel, categoryLabel } from "../../lib/i18n";

type Tile = {
  href?: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  emphasis?: boolean;
};

function StatTile({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  const inner = (
    <div className={`group rounded-xl border border-neutral-800 bg-[#161616] hover:bg-[#1c1c1c] hover:border-neutral-700 transition-colors p-5 h-full ${tile.emphasis ? "border-violet-500/40" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="text-[13px] text-neutral-400 font-medium">{tile.label}</div>
        <Icon size={16} strokeWidth={1.75} className="text-neutral-500" />
      </div>
      <div className="text-3xl font-semibold text-neutral-50 mt-4 leading-none">{tile.value}</div>
      {tile.hint && <div className="text-[11px] text-neutral-500 mt-2">{tile.hint}</div>}
    </div>
  );
  return tile.href ? (
    <Link href={tile.href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

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

function RecentRow({ t }: { t: any }) {
  return (
    <Link href={`/tickets/${t._id}`} className="block px-5 py-3.5 hover:bg-neutral-900 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[t.status] ?? "bg-neutral-700"}`}>{statusLabel(t.status)}</span>
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIO_COLOR[t.priority] ?? "bg-neutral-700"}`}>{priorityLabel(t.priority)}</span>
            {(t.aiCategory || t.category) && (
              <span className="text-[10px] text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded">{categoryLabel(t.aiCategory ?? t.category)}</span>
            )}
          </div>
          <div className="text-sm font-medium text-neutral-100 truncate">{t.title}</div>
          <div className="text-xs text-neutral-500 mt-0.5 truncate">
            {t.clientId?.name ?? "—"}{t.assigneeId?.name ? ` · ${t.assigneeId.name}` : " · не назначен"}
          </div>
        </div>
        <div className="text-[11px] text-neutral-500 whitespace-nowrap">
          {t.createdAt ? new Date(t.createdAt).toLocaleDateString("ru-RU") : ""}
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, aiAvailable } = useAuth();
  const isPrivileged = user?.role === "admin" || user?.role === "manager";
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [clientsCount, setClientsCount] = useState<number | null>(null);
  const [operatorsCount, setOperatorsCount] = useState<number | null>(null);
  const [digest, setDigest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.listTickets({ limit: "8" }).catch(() => ({ tickets: [] })),
      isPrivileged ? api.analytics().catch(() => null) : Promise.resolve(null),
      api.listClients().catch(() => ({ clients: [] })),
      isPrivileged ? api.listOperators().catch(() => ({ operators: [] })) : Promise.resolve({ operators: [] }),
      isPrivileged && aiAvailable ? api.digest(24).catch(() => null) : Promise.resolve(null),
    ])
      .then(([tickets, ana, clients, ops, dig]) => {
        setRecent((tickets as any).tickets ?? []);
        if (ana) setAnalytics(ana);
        setClientsCount((clients as any).clients?.length ?? 0);
        setOperatorsCount((ops as any).operators?.length ?? 0);
        if (dig) setDigest(dig);
      })
      .finally(() => setLoading(false));
  }, [isPrivileged, aiAvailable]);

  const aiProcessedPct = analytics?.aiProcessed && analytics?.totalTickets
    ? Math.round((analytics.aiProcessed / analytics.totalTickets) * 100)
    : 0;

  const tiles: Tile[] = [
    { label: "Всего заявок", value: analytics?.totalTickets ?? "—", icon: Ticket, href: "/tickets", emphasis: true },
    { label: "Открытые", value: analytics?.openTickets ?? "—", icon: Flame, href: "/tickets", hint: analytics?.totalTickets ? `${Math.round((analytics.openTickets / analytics.totalTickets) * 100)}% открытых` : undefined },
    { label: "Ср. обработка", value: analytics?.avgProcessingMins != null ? `${Math.round(analytics.avgProcessingMins)} мин` : "—", icon: Clock, hint: analytics?.avgFirstResponseMins != null ? `Ответ за ${Math.round(analytics.avgFirstResponseMins)} мин` : undefined },
    { label: "Обработано ИИ", value: aiProcessedPct ? `${aiProcessedPct}%` : "—", icon: Sparkles, hint: analytics?.aiProcessed ? `${analytics.aiProcessed} из ${analytics.totalTickets}` : undefined },
    { label: "Клиенты", value: clientsCount ?? "—", icon: Building2, href: "/clients" },
    { label: "Операторы", value: operatorsCount ?? "—", icon: Users },
    { label: "Решено", value: analytics?.resolvedTickets ?? "—", icon: CheckCircle2 },
    { label: "Категории", value: analytics?.byCategory?.length ?? "—", icon: Tag },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return "Доброй ночи";
    if (h < 12) return "Доброе утро";
    if (h < 18) return "Добрый день";
    return "Добрый вечер";
  })();

  return (
    <div className="p-6 md:p-8 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">{greeting}, {user?.name?.split(" ")[0] ?? "—"}</h1>
          <p className="text-sm text-neutral-400 mt-1">Добро пожаловать в kazcrmai. Здесь — общий обзор по вашей компании.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${aiAvailable ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border border-amerald-500/30"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${aiAvailable ? "bg-emerald-400" : "bg-amber-400"}`} />
            {aiAvailable ? "ИИ онлайн" : "ИИ ожидает деплоя"}
          </span>
        </div>
      </header>

      {loading && <div className="text-sm text-neutral-500">Загрузка…</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => <StatTile key={t.label} tile={t} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-[#161616] border border-neutral-800 rounded-xl">
          <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-800">
            <div>
              <div className="font-semibold text-neutral-100">Свежие заявки</div>
              <div className="text-xs text-neutral-500 mt-0.5">Последние обращения</div>
            </div>
            <Link href="/tickets" className="text-xs font-medium text-violet-400 hover:text-violet-300 inline-flex items-center gap-1">
              Все <ArrowRight size={12} strokeWidth={2} />
            </Link>
          </div>
          <div className="divide-y divide-neutral-800">
            {recent.length === 0 ? (
              <div className="p-8 text-sm text-neutral-500 text-center">Нет заявок</div>
            ) : (
              recent.map((t) => <RecentRow key={t._id} t={t} />)
            )}
          </div>
        </div>

        {aiAvailable && (
          <div className="bg-gradient-to-br from-violet-600/10 to-[#161616] border border-violet-500/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} strokeWidth={1.75} className="text-violet-400" />
              <span className="font-semibold text-neutral-100">ИИ-дайджест</span>
              <span className="text-[10px] text-neutral-400 ml-auto">за 24ч</span>
            </div>
            {digest ? (
              <>
                {digest.headline && (
                  <div className="text-sm font-semibold text-neutral-100 mb-3 leading-5">{digest.headline}</div>
                )}
                {digest.insights?.slice(0, 3).map((s: string, i: number) => (
                  <div key={i} className="text-xs text-neutral-300 mb-1.5 leading-5">• {s}</div>
                ))}
                {digest.recommendations?.slice(0, 2).map((s: string, i: number) => (
                  <div key={i} className="text-xs text-emerald-400 font-medium mb-1 leading-5 inline-flex items-start gap-1">
                    <TrendingUp size={11} strokeWidth={2} className="mt-1 shrink-0" />
                    <span>{s}</span>
                  </div>
                ))}
                <Link href="/analytics" className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-violet-400 hover:text-violet-300">
                  Подробнее <ArrowRight size={11} strokeWidth={2} />
                </Link>
              </>
            ) : (
              <div className="text-xs text-neutral-400 italic leading-5">Загружаем дайджест…</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
