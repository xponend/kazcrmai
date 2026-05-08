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
    <div className="flex-1 flex items-center justify-center p-6 bg-[#0a0a0a]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3 flex flex-col items-center">
          <svg width="56" height="56" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7.2" fill="#F1ECE0" />
            <g stroke="#1A1816" strokeWidth="3.4" strokeLinecap="round" fill="none">
              <line x1="10.5" y1="7.5" x2="10.5" y2="24.5" />
              <line x1="10.7" y1="16" x2="22" y2="8" />
              <line x1="10.7" y1="16" x2="22" y2="24" />
            </g>
            <path
              d="M24.6 7.4 L25.3 9.1 L27 9.8 L25.3 10.5 L24.6 12.2 L23.9 10.5 L22.2 9.8 L23.9 9.1 Z"
              fill="#D97757"
            />
          </svg>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">kazcrmai</h1>
          <p className="text-sm text-neutral-400">Админ-панель</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-3 bg-[#161616] border border-neutral-800 rounded-xl p-5 shadow-xl"
        >
          <label className="block">
            <span className="text-xs font-medium text-neutral-300">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-300">Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-md bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 disabled:opacity-60"
          >
            {submitting ? "Входим…" : "Войти"}
          </button>
        </form>

        <div className="text-xs text-neutral-400 bg-[#161616] border border-neutral-800 rounded-lg p-3 space-y-1">
          <div className="font-semibold text-neutral-200">Демо-доступы</div>
          <div>admin@crm.kz / admin123</div>
          <div>aliya@crm.kz / pass123 (manager)</div>
          <div>aizhan@crm.kz / pass123 (operator)</div>
        </div>
      </div>
    </div>
  );
}
