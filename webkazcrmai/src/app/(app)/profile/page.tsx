"use client";

import { useEffect, useState } from "react";
import { Mail, Shield, User as UserIcon, LogOut, KeyRound, Check } from "lucide-react";
import { api, ApiError } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { ROLE_LABELS } from "../../../lib/i18n";

function ProfileEditCard() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const dirty = name.trim() !== (user?.name ?? "") || email.trim() !== (user?.email ?? "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!name.trim()) {
      setError("Имя не может быть пустым");
      return;
    }
    setBusy(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      setDone(true);
    } catch (err) {
      const msg =
        err instanceof ApiError && (err as ApiError).code === "EMAIL_TAKEN"
          ? "Этот email уже занят"
          : err instanceof Error
            ? err.message
            : "Не удалось обновить профиль";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40";

  return (
    <div className="bg-[#161616] border border-neutral-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserIcon size={16} strokeWidth={1.75} className="text-neutral-400" />
        <span className="text-sm font-semibold text-neutral-100">Имя и логин</span>
      </div>
      <form onSubmit={submit} className="space-y-3 max-w-sm">
        <label className="block">
          <span className="text-xs text-neutral-500">Имя</span>
          <input className={inputCls} value={name} onChange={(e) => { setName(e.target.value); setDone(false); }} required />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Email (логин)</span>
          <input className={inputCls} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setDone(false); }} required />
        </label>
        {error && <div className="text-xs text-red-400">{error}</div>}
        {done && (
          <div className="text-xs text-emerald-400 inline-flex items-center gap-1">
            <Check size={13} strokeWidth={2} /> Сохранено
          </div>
        )}
        <button
          type="submit"
          disabled={busy || !dirty}
          className="px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium"
        >
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
      </form>
    </div>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next.length < 8) {
      setError("Новый пароль должен быть не менее 8 символов");
      return;
    }
    if (next !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      const msg =
        err instanceof ApiError && (err as ApiError).code === "BAD_PASSWORD"
          ? "Текущий пароль неверен"
          : err instanceof Error
            ? err.message
            : "Не удалось изменить пароль";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40";

  return (
    <div className="bg-[#161616] border border-neutral-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound size={16} strokeWidth={1.75} className="text-neutral-400" />
        <span className="text-sm font-semibold text-neutral-100">Смена пароля</span>
      </div>
      <form onSubmit={submit} className="space-y-3 max-w-sm">
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Текущий пароль"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputCls}
          required
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Новый пароль (мин. 8 символов)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputCls}
          required
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Повторите новый пароль"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputCls}
          required
        />
        {error && <div className="text-xs text-red-400">{error}</div>}
        {done && (
          <div className="text-xs text-emerald-400 inline-flex items-center gap-1">
            <Check size={13} strokeWidth={2} /> Пароль изменён
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium"
        >
          {busy ? "Сохранение…" : "Изменить пароль"}
        </button>
      </form>
    </div>
  );
}

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

      <ProfileEditCard />

      <ChangePasswordCard />

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
