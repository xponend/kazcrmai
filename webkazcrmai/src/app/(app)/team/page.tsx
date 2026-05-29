"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, KeyRound, ShieldCheck, Power, X, Check } from "lucide-react";
import { api, ApiError } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { roleLabel } from "../../../lib/i18n";

type StaffUser = {
  _id: string;
  name: string;
  email: string;
  role: "operator" | "manager" | "admin";
  skills?: string[];
  currentLoad?: number;
  isActive?: boolean;
};

const ROLE_OPTIONS: Array<{ value: StaffUser["role"]; label: string }> = [
  { value: "operator", label: "Оператор" },
  { value: "manager", label: "Менеджер" },
  { value: "admin", label: "Администратор" },
];

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-red-500/20 text-red-300",
  manager: "bg-violet-500/20 text-violet-300",
  operator: "bg-blue-500/20 text-blue-300",
};

const inputCls =
  "w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40";

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "Произошла ошибка";
}

function AddStaffForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffUser["role"]>("operator");
  const [skills, setSkills] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    setBusy(true);
    try {
      await api.createUser({
        name,
        email,
        password,
        role,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setName("");
      setEmail("");
      setPassword("");
      setSkills("");
      setRole("operator");
      setDone(true);
      onCreated();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#161616] border border-neutral-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus size={16} strokeWidth={1.75} className="text-neutral-400" />
        <span className="text-sm font-semibold text-neutral-100">Добавить сотрудника</span>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className={inputCls} placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputCls} type="password" placeholder="Пароль (мин. 8)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as StaffUser["role"])}>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input className={`${inputCls} sm:col-span-2`} placeholder="Навыки через запятую (для маршрутизации ИИ)" value={skills} onChange={(e) => setSkills(e.target.value)} />
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium">
            {busy ? "Создание…" : "Создать"}
          </button>
          {error && <span className="text-xs text-red-400">{error}</span>}
          {done && <span className="text-xs text-emerald-400 inline-flex items-center gap-1"><Check size={13} strokeWidth={2} /> Создан</span>}
        </div>
      </form>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }: { user: StaffUser; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    setBusy(true);
    try {
      await api.resetUserPassword(user._id, pw);
      setDone(true);
      setTimeout(onClose, 800);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#161616] border border-neutral-800 rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-neutral-100 inline-flex items-center gap-2">
            <KeyRound size={15} strokeWidth={1.75} /> Сброс пароля — {user.name}
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className={inputCls} type="text" placeholder="Новый пароль (мин. 8)" value={pw} onChange={(e) => setPw(e.target.value)} required />
          <p className="text-[11px] text-neutral-500">Все активные сессии сотрудника будут завершены.</p>
          {error && <div className="text-xs text-red-400">{error}</div>}
          {done && <div className="text-xs text-emerald-400">Пароль сброшен</div>}
          <button type="submit" disabled={busy} className="w-full px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium">
            {busy ? "Сохранение…" : "Сбросить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}

function StaffRow({ u, isSelf, onChanged }: { u: StaffUser; isSelf: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [resetFor, setResetFor] = useState<StaffUser | null>(null);

  const changeRole = async (role: StaffUser["role"]) => {
    if (role === u.role) return;
    setBusy(true);
    try {
      await api.updateUser(u._id, { role });
      onChanged();
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    try {
      await api.updateUser(u._id, { isActive: !u.isActive });
      onChanged();
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`px-5 py-3.5 flex items-center gap-3 flex-wrap ${u.isActive === false ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-neutral-100 truncate">
          {u.name} {isSelf && <span className="text-[10px] text-neutral-500">(вы)</span>}
        </div>
        <div className="text-xs text-neutral-500 truncate">{u.email}</div>
        {u.skills && u.skills.length > 0 && (
          <div className="text-[11px] text-neutral-600 mt-0.5 truncate">{u.skills.join(", ")}</div>
        )}
      </div>
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${ROLE_BADGE[u.role] ?? "bg-neutral-700"}`}>
        {roleLabel(u.role)}
      </span>
      {u.role === "operator" && (
        <span className="text-[11px] text-neutral-500">нагрузка: {u.currentLoad ?? 0}</span>
      )}
      <select
        className="px-2 py-1 rounded-md border border-neutral-800 bg-neutral-900/50 text-xs disabled:opacity-50"
        value={u.role}
        disabled={busy || isSelf}
        title={isSelf ? "Нельзя менять собственную роль" : "Изменить роль"}
        onChange={(e) => changeRole(e.target.value as StaffUser["role"])}
      >
        {ROLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <button
        onClick={() => setResetFor(u)}
        disabled={busy}
        title="Сбросить пароль"
        className="p-1.5 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
      >
        <KeyRound size={15} strokeWidth={1.75} />
      </button>
      <button
        onClick={toggleActive}
        disabled={busy || isSelf}
        title={u.isActive === false ? "Активировать" : "Деактивировать"}
        className={`p-1.5 rounded hover:bg-neutral-800 disabled:opacity-50 ${u.isActive === false ? "text-emerald-400" : "text-neutral-400 hover:text-red-300"}`}
      >
        <Power size={15} strokeWidth={1.75} />
      </button>
      {resetFor && <ResetPasswordModal user={resetFor} onClose={() => setResetFor(null)} />}
    </div>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listUsers()
      .then((r) => setUsers(r.users ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Не удалось загрузить команду"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (user && user.role !== "admin") {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-[#161616] border border-neutral-800 rounded-xl p-6 text-sm text-neutral-400 inline-flex items-center gap-2">
          <ShieldCheck size={16} className="text-amber-400" />
          Управление командой доступно только администратору.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Команда</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Операторы исполняют заявки (ИИ-маршрутизация назначает их автоматически). Менеджеры и админы видят всё и могут назначаться вручную.
        </p>
      </div>

      <AddStaffForm onCreated={load} />

      <div className="bg-[#161616] border border-neutral-800 rounded-xl">
        <div className="px-5 py-4 border-b border-neutral-800 text-sm font-semibold text-neutral-100">
          Сотрудники {users.length > 0 && <span className="text-neutral-500 font-normal">· {users.length}</span>}
        </div>
        {loading ? (
          <div className="p-8 text-sm text-neutral-500 text-center">Загрузка…</div>
        ) : error ? (
          <div className="p-8 text-sm text-red-400 text-center">{error}</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-sm text-neutral-500 text-center">Сотрудников нет</div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {users.map((u) => (
              <StaffRow key={u._id} u={u} isSelf={u._id === user?.id} onChanged={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
