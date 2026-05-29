"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";

export default function LandingLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user } = await api.login(email.trim(), password);
      if (user.role !== "client") {
        // Staff accounts belong to the admin panel, not the client portal.
        await api.logout();
        setError("Этот аккаунт принадлежит сотруднику. Используйте вход для персонала: /login");
        return;
      }
      router.push("/landing/portal");
    } catch (err) {
      setError((err as { message?: string }).message ?? "Не удалось войти");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "mt-1 w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40";

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">Вход в кабинет</h1>
          <p className="text-sm text-neutral-400">Войдите, чтобы управлять заявками</p>
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
              className={inputCls}
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
              className={inputCls}
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

        <p className="text-center text-sm text-neutral-400">
          Нет аккаунта?{" "}
          <Link href="/landing/register" className="text-violet-400 hover:text-violet-300 font-medium">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
