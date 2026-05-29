"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Пароль должен содержать не менее 8 символов");
      return;
    }
    setSubmitting(true);
    try {
      await api.register({
        name: name.trim(),
        email: email.trim(),
        password,
        company: company.trim(),
        phone: phone.trim() || undefined,
      });
      router.push("/landing/portal");
    } catch (err) {
      setError((err as { message?: string }).message ?? "Не удалось зарегистрироваться");
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
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">Регистрация</h1>
          <p className="text-sm text-neutral-400">Создайте аккаунт для доступа к порталу поддержки</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-3 bg-[#161616] border border-neutral-800 rounded-xl p-5 shadow-xl"
        >
          <label className="block">
            <span className="text-xs font-medium text-neutral-300">Имя</span>
            <input
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </label>
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
            <span className="text-xs font-medium text-neutral-300">Компания</span>
            <input
              type="text"
              autoComplete="organization"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-300">
              Телефон <span className="text-neutral-500">(необязательно)</span>
            </span>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-300">Пароль</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
            <span className="text-[11px] text-neutral-500 mt-1 block">Не менее 8 символов</span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-md bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 disabled:opacity-60"
          >
            {submitting ? "Регистрируем…" : "Зарегистрироваться"}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-400">
          Уже есть аккаунт?{" "}
          <Link href="/landing/login" className="text-violet-400 hover:text-violet-300 font-medium">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
