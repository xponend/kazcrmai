"use client";

import { useState } from "react";
import { useAuth } from "../../lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Не удалось войти");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-600 text-white text-xl font-bold">k</div>
          <h1 className="text-2xl font-semibold tracking-tight">kazcrmai</h1>
          <p className="text-sm text-slate-500">Админ-панель</p>
        </div>

        <form onSubmit={submit} className="space-y-3 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-md bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60"
          >
            {submitting ? "Входим…" : "Войти"}
          </button>
        </form>

        <div className="text-xs text-slate-500 bg-slate-100 rounded-lg p-3 space-y-1">
          <div className="font-semibold text-slate-700">Демо-доступы</div>
          <div>admin@crm.kz / admin123</div>
          <div>aliya@crm.kz / pass123 (manager)</div>
          <div>aizhan@crm.kz / pass123 (operator)</div>
        </div>
      </div>
    </div>
  );
}
