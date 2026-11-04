'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { NAV } from './nav-items';
import { PrivacyToggle } from './privacy-toggle';

/** Barra superior + menu lateral deslizante, só em telas < md (a Sidebar some no celular). */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Fecha ao navegar.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Esc fecha; bloqueia a rolagem do fundo enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [open]);

  return (
    <div className="md:hidden">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-neutral-50/95 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <span className="font-semibold">OpenFinance Hub</span>
        <button
          type="button" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open} aria-controls="mobile-menu"
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-lg leading-none dark:border-neutral-700"
        >☰</button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <nav id="mobile-menu" className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-white p-4 shadow-xl dark:bg-neutral-950">
            <div className="mb-4 flex items-center justify-between px-2">
              <span className="text-lg font-semibold">OpenFinance Hub</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="rounded-lg px-2 py-1 text-xl leading-none">✕</button>
            </div>
            <div className="space-y-1">
              {NAV.map((item) => (
                <Link
                  key={item.href} href={item.href}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'bg-brand-50 font-medium text-brand-600 dark:bg-neutral-900'
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'
                  )}
                >
                  <span>{item.icon}</span><span>{item.label}</span>
                </Link>
              ))}
            </div>
            <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-900"><PrivacyToggle /></div>
          </nav>
        </div>
      )}
    </div>
  );
}
