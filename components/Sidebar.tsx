'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  SparklesIcon,
  ListBulletIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const SECTIONS = [
  {
    title: 'Watching',
    links: [
      { href: '/', label: 'Best deals', icon: SparklesIcon },
      { href: '/watchlists', label: 'Watchlists', icon: ListBulletIcon },
    ],
  },
  {
    title: 'Trading',
    links: [
      { href: '/cart', label: 'Cart', icon: ShoppingCartIcon },
      { href: '/orders', label: 'Buy orders', icon: BanknotesIcon },
      { href: '/purchases', label: 'Purchases', icon: ShoppingBagIcon },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (pathname === '/login') return null;

  async function logout() {
    await fetch('/api/auth/login', { method: 'DELETE' });
    router.replace('/login');
    router.refresh();
  }

  const nav = (
    <>
      <div className="flex items-center gap-2.5 px-3 py-1">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-sm font-bold text-primary">
          SB
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Skin Bots</p>
          <p className="text-[11px] text-muted-foreground">3 accounts</p>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.links.map((l) => {
                const active = pathname === l.href;
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-surface-hover font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-surface hover:text-foreground'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-primary" aria-hidden="true" />
                    )}
                    <Icon className={`h-[18px] w-[18px] ${active ? 'text-primary' : ''}`} aria-hidden="true" />
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <button
        onClick={logout}
        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
      >
        <ArrowRightStartOnRectangleIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        Sign out
      </button>
    </>
  );

  return (
    <>
      {/* Mobile bar — the sidebar itself is off-canvas below lg. */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <Bars3Icon className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="text-sm font-semibold tracking-tight">Skin Bots</span>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-sidebar p-4">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-sidebar p-4 lg:flex">
        {nav}
      </aside>
    </>
  );
}
