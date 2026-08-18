'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SparklesIcon,
  ListBulletIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';

const LINKS = [
  { href: '/', label: 'Best deals', icon: SparklesIcon },
  { href: '/watchlists', label: 'Watchlists', icon: ListBulletIcon },
  { href: '/orders', label: 'Buy orders', icon: BanknotesIcon },
  { href: '/purchases', label: 'Purchases', icon: ShoppingBagIcon },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') return null;

  async function logout() {
    await fetch('/api/auth/login', { method: 'DELETE' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-surface hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <ArrowRightStartOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </header>
  );
}
