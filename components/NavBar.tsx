'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Best deals' },
  { href: '/watchlists', label: 'Watchlists' },
  { href: '/orders', label: 'Buy orders' },
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
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-100'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-200"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
