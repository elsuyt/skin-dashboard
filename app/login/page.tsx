'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { inputClass, btnPrimary } from '@/components/ui';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Wrong password.');
      return;
    }
    router.replace(params.get('next') || '/');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-surface/60 p-7">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-sm font-bold text-primary">SB</span>
          <div className="leading-tight">
            <h1 className="text-base font-semibold tracking-tight">Skin Bots</h1>
            <p className="text-xs text-muted-foreground">Control panel</p>
          </div>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          This controls live watchlists and real Steam buy orders.
        </p>

        <label htmlFor="password" className="mt-5 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputClass} mt-1.5 w-full`}
        />

        {error && (
          <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={`${btnPrimary} mt-5 w-full`}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
