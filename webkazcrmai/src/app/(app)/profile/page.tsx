"use client";

import { useEffect, useState } from "react";
import { Mail, Shield, User as UserIcon, LogOut } from "lucide-react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { ROLE_LABELS } from "../../../lib/i18n";

export default function ProfilePage() {
  const { user, logout, aiAvailable } = useAuth();
  const [serverEcho, setServerEcho] = useState<{ user: any } | null>(null);

  useEffect(() => {
    api.me().then(setServerEcho).catch(() => {});
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const ROLE_LABEL = ROLE_LABELS;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Профиль</h1>

      <div className="bg-[#161616] border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-violet-600 grid place-items-center text-xl font-bold text-white">
            {initials}
          </div>
          <div>
            <div className="text-lg font-semibold text-neutral-50">{user.name}</div>
            <div className="text-sm text-neutral-400">{user.email}</div>
            <div className="text-[11px] uppercase font-semibold text-violet-300 mt-1">
              {ROLE_LABEL[user.role] ?? user.role}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-neutral-800">
          <div className="flex items-center gap-2.5 text-sm">
            <UserIcon size={14} strokeWidth={1.75} className="text-neutral-500" />
            <div>
              <div className="text-xs text-neutral-500">ID пользователя</div>
              <div className="font-mono text-[11px] text-neutral-300">{user.id.slice(-8)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Mail size={14} strokeWidth={1.75} className="text-neutral-500" />
            <div>
              <div className="text-xs text-neutral-500">Email</div>
              <div className="text-neutral-300">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Shield size={14} strokeWidth={1.75} className="text-neutral-500" />
            <div>
              <div className="text-xs text-neutral-500">Доступ</div>
              <div className="text-neutral-300">{ROLE_LABEL[user.role] ?? user.role}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#161616] border border-neutral-800 rounded-xl p-5">
        <div className="text-sm font-semibold text-neutral-100 mb-3">Состояние сервера</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-neutral-500">ИИ-функции</div>
            <div className={aiAvailable ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
              {aiAvailable ? "доступны" : "ожидают деплоя"}
            </div>
          </div>
          <div>
            <div className="text-neutral-500">Сессия подтверждена</div>
            <div className={serverEcho ? "text-emerald-400 font-medium" : "text-neutral-400"}>
              {serverEcho ? "да (/auth/me OK)" : "—"}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={logout}
        className="w-full py-2.5 rounded-md border border-red-500/40 text-red-300 text-sm font-medium hover:bg-red-500/10 inline-flex items-center justify-center gap-2"
      >
        <LogOut size={14} strokeWidth={1.75} />
        Выйти из аккаунта
      </button>
    </div>
  );
}
