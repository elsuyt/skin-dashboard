'use client';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

// The sidebar is hidden on /login, so the main column's matching offset has to
// come off with it — otherwise the login card is centred inside a 240px-narrower
// box and sits visibly right of centre.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === '/login';

  return (
    <>
      <Sidebar />
      <main className={bare ? '' : 'lg:pl-60'}>{children}</main>
    </>
  );
}
