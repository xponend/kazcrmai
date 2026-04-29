"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "../../../../lib/api";

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await api.createClient({
        name: name.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(company.trim() ? { company: company.trim() } : {}),
      });
      router.replace(`/clients/${r.client._id}`);
    } catch (err) {
      setError((err as { message?: string }).message ?? "Не удалось создать клиента");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <button
        onClick={() => router.back()}
        className="text-xs text-neutral-400 hover:text-neutral-50 inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft size={12} strokeWidth={2} /> Назад
      </button>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Новый клиент</h1>

      <form onSubmit={submit} className="space-y-4 bg-[#161616] border border-neutral-800 rounded-xl p-6">
        <label className="block">
          <span className="text-xs font-medium text-neutral-300">Имя / название организации</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="ТОО «Компания»"
            className="mt-1 w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-neutral-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@company.kz"
              className="mt-1 w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-300">Телефон</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 700 000 0000"
              className="mt-1 w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-neutral-300">Компания</span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Бренд / короткое имя"
            className="mt-1 w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
          />
        </label>

        {error && <div className="text-sm text-red-300">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-md bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 disabled:opacity-60"
        >
          {submitting ? "Создаём…" : "Создать клиента"}
        </button>
      </form>
    </div>
  );
}
