"use client";

import Link from "next/link";
import { Sparkles, ListChecks, MessageSquare, ArrowRight } from "lucide-react";

const features = [
  {
    Icon: MessageSquare,
    title: "Оставьте заявку",
    text: "Опишите проблему или вопрос — заявка моментально попадёт в нашу систему поддержки.",
  },
  {
    Icon: Sparkles,
    title: "ИИ всё классифицирует",
    text: "Искусственный интеллект автоматически определит категорию и приоритет и направит заявку нужному специалисту.",
  },
  {
    Icon: ListChecks,
    title: "Отслеживайте статус",
    text: "Следите за ходом решения в реальном времени и общайтесь со специалистом в комментариях.",
  },
];

export default function LandingHome() {
  return (
    <div className="flex-1">
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 bg-violet-500/10 border border-violet-500/30 rounded-full px-3 py-1 mb-6">
          <Sparkles size={12} strokeWidth={1.75} /> Поддержка с искусственным интеллектом
        </span>
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-neutral-50 leading-tight">
          Портал поддержки kazcrmai
        </h1>
        <p className="mt-5 text-base sm:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
          Оставляйте заявки, отслеживайте их статус и получайте помощь быстрее.
          ИИ автоматически классифицирует обращение и направит его профильному специалисту.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/landing/login"
            className="w-full sm:w-auto px-7 py-3 rounded-md bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition inline-flex items-center justify-center gap-2"
          >
            Войти
          </Link>
          <Link
            href="/landing/register"
            className="w-full sm:w-auto px-7 py-3 rounded-md border border-neutral-700 bg-[#161616] text-neutral-100 text-sm font-semibold hover:bg-[#1c1c1c] hover:border-neutral-600 transition inline-flex items-center justify-center gap-2"
          >
            Регистрация <ArrowRight size={15} strokeWidth={2} />
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map(({ Icon, title, text }) => (
            <div
              key={title}
              className="rounded-xl border border-neutral-800 bg-[#161616] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 text-violet-300 grid place-items-center mb-4">
                <Icon size={18} strokeWidth={1.75} />
              </div>
              <div className="text-sm font-semibold text-neutral-100">{title}</div>
              <p className="text-sm text-neutral-400 mt-1.5 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
