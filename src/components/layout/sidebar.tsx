'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { PrivacyToggle } from './privacy-toggle';
import { NAV } from './nav-items';

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
              pathname === item.href || pathname.startsWith(item.href + '/')
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
