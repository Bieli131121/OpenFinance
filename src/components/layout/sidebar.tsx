'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { PrivacyToggle } from './privacy-toggle';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/search', label: 'Buscar', icon: '🔍' },
  { href: '/cards', label: 'Cartões', icon: '💳' },
  { href: '/accounts', label: 'Contas', icon: '🏦' },
  { href: '/transactions', label: 'Transações', icon: '💰' },
  { href: '/budgets', label: 'Orçamento', icon: '📐' },
  { href: '/analytics', label: 'Análises', icon: '📊' },
  { href: '/calendar', label: 'Calendário', icon: '📅' },
  { href: '/recurring', label: 'Recorrentes', icon: '🔄' },
  { href: '/goals', label: 'Metas', icon: '🎯' },
  { href: '/debts', label: 'Dívidas', icon: '💸' },
  { href: '/financings', label: 'Financiamentos', icon: '🏠' },
  { href: '/investments', label: 'Investimentos', icon: '📈' },
  { href: '/net-worth', label: 'Patrimônio', icon: '💎' },
  { href: '/reports', label: 'Relatórios', icon: '📑' },
  { href: '/open-finance', label: 'Open Finance', icon: '🔗' },
  { href: '/notifications', label: 'Notificações', icon: '🔔' },
  { href: '/settings', label: 'Configurações', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-neutral-200 p-4 dark:border-neutral-800 md:block">
      <div className="mb-6 px-2 text-lg font-semibold">OpenFinance Hub</div>
      <nav className="space-y-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              pathname === item.href
                ? 'bg-brand-50 font-medium text-brand-600 dark:bg-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-6 border-t border-neutral-100 pt-3 dark:border-neutral-900">
        <PrivacyToggle />
      </div>
    </aside>
  );
}
