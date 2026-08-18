'use client';
import { useEffect, useMemo, useState } from 'react';
import { BOTS } from '@/lib/bots';
import { api, NotConfiguredError } from '@/lib/api-client';
import { SetupBanner, ErrorBanner } from '@/components/StateBanner';
import type { Purchase } from '@/lib/types';
import { ShoppingBagIcon, BoltIcon, CursorArrowRaysIcon } from '@heroicons/react/24/outline';

const WATCHLIST_BOTS = BOTS.filter((b) => b.kind === 'watchlist');

interface Row extends Purchase {
  bot: string;
  account: string;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function PurchasesPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState('');
  const [via, setVia] = useState<'all' | 'auto' | 'manual'>('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const results = await Promise.all(WATCHLIST_BOTS.map((b) => api.getWatchlist(b.key)));
        if (cancelled) return;
        const next: Row[] = [];
        results.forEach((state, i) => {
          const bot = WATCHLIST_BOTS[i];
          for (const p of state.purchases || []) {
            next.push({ ...p, bot: bot.key, account: bot.account });
          }
        });
        next.sort((a, b) => b.at - a.at);
        setRows(next);
        setNotConfigured(false);
        setError('');
      } catch (e) {
        if (cancelled) return;
        if (e instanceof NotConfiguredError) setNotConfigured(true);
        else setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    const id = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return via === 'all' ? rows : rows.filter((r) => r.via === via);
  }, [rows, via]);

  const totals = useMemo(() => {
    const spent = filtered.reduce((s, r) => s + r.price, 0);
    const auto = filtered.filter((r) => r.via === 'auto').length;
    return { spent, auto, manual: filtered.length - auto, count: filtered.length };
  }, [filtered]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Purchases</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything actually bought across skin-sniper and account #3 — auto-buys and manual confirms, newest first.
      </p>

      {notConfigured && <div className="mt-5"><SetupBanner /></div>}
      {error && <div className="mt-5"><ErrorBanner message={error} /></div>}

      {rows && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">Total spent</p>
              <p className="mt-1 font-mono text-lg font-semibold">{money(totals.spent)}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">Purchases</p>
              <p className="mt-1 font-mono text-lg font-semibold">{totals.count}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface/60 px-4 py-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><BoltIcon className="h-3.5 w-3.5" aria-hidden="true" /> Auto-bought</p>
              <p className="mt-1 font-mono text-lg font-semibold text-accent">{totals.auto}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface/60 px-4 py-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><CursorArrowRaysIcon className="h-3.5 w-3.5" aria-hidden="true" /> Manual</p>
              <p className="mt-1 font-mono text-lg font-semibold">{totals.manual}</p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            {(['all', 'auto', 'manual'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVia(v)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  via === v ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-surface hover:text-foreground'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </>
      )}

      {!rows && !notConfigured && !error && (
        <div className="mt-8 space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-surface" />)}
        </div>
      )}

      {rows && (
        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Skin</th>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Site</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Float</th>
                <th className="px-3 py-2 font-medium">Via</th>
                <th className="px-3 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.bot}:${r.id}`} className="border-t border-border transition-colors hover:bg-surface/60">
                  <td className="px-3 py-2">
                    {r.name} {r.exterior && <span className="text-muted-foreground">({r.exterior})</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.account}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.site}</td>
                  <td className="px-3 py-2 font-mono font-medium">{money(r.price)}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{r.float != null ? r.float.toFixed(4) : '—'}</td>
                  <td className="px-3 py-2">
                    {r.via === 'auto' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-xs font-medium text-accent">
                        <BoltIcon className="h-3 w-3" aria-hidden="true" /> auto{r.steamPct != null ? ` · ${r.steamPct}%` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        <CursorArrowRaysIcon className="h-3 w-3" aria-hidden="true" /> manual
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(r.at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="flex flex-col items-center gap-2 px-3 py-14 text-center text-sm text-muted-foreground">
              <ShoppingBagIcon className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              Nothing bought yet under this filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
