"use client";

import Link from "next/link";
import { ReactNode } from "react";

function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
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
  );
}

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-neutral-100">
      <header className="border-b border-neutral-800 bg-[#0a0a0a]/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/landing" className="flex items-center gap-2.5 min-w-0">
            <BrandMark size={28} />
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight leading-none truncate">kazcrmai</div>
              <div className="text-[10px] text-neutral-500 leading-none mt-0.5 truncate">
                Личный кабинет клиента
              </div>
            </div>
          </Link>
          <Link
            href="/landing/login"
            className="text-xs font-medium text-neutral-300 hover:text-neutral-50 transition"
          >
            Войти
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      <footer className="border-t border-neutral-800 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-[11px] text-neutral-600">
          kazcrmai — система поддержки клиентов с ИИ
        </div>
      </footer>
    </div>
  );
}
