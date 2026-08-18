'use client';
import { useEffect, useMemo, useState } from 'react';
import { BOTS, ACCOUNTS } from '@/lib/bots';
import { api, NotConfiguredError } from '@/lib/api-client';
import { SetupBanner, ErrorBanner } from '@/components/StateBanner';
import type { WatchMatch, WatchItem } from '@/lib/types';
import { ArrowTopRightOnSquareIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

const WATCHLIST_BOTS = BOTS.filter((b) => b.kind === 'watchlist');

interface Row {
  bot: string;
  account: string;
  watch: WatchItem;
  match: WatchMatch;
  steamPct: number | null;
  thirdPct: number | null;
}

function pct(price: number | null | undefined, ref: number | null | undefined) {
  if (price == null || ref == null || ref <= 0) return null;
  return Math.round((price / ref) * 100);
}

export default function BestDealsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState('');
  const [account, setAccount] = useState<string>('All');
  const [maxFloat, setMaxFloat] = useState('');
  const [maxSteamPct, setMaxSteamPct] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const results = await Promise.all(WATCHLIST_BOTS.map((b) => api.getWatchlist(b.key)));
        if (cancelled) return;
        const next: Row[] = [];
        let hidden = 0;
        results.forEach((state, i) => {
          const bot = WATCHLIST_BOTS[i];
          const matchByWatch = new Map(state.matches.map((m) => [m.watchId, m]));
          for (const watch of state.watches) {
            if (!watch.enabled) continue;
            const match = matchByWatch.get(watch.id);
            if (!match) { hidden++; continue; }
            next.push({
              bot: bot.key,
              account: bot.account,
              watch,
              match,
              steamPct: pct(match.price, match.steamPrice),
              thirdPct: pct(match.price, match.thirdLowPrice),
            });
          }
        });
        next.sort((a, b) => (a.steamPct ?? 999) - (b.steamPct ?? 999));
        setRows(next);
        setHiddenCount(hidden);
        setNotConfigured(false);
        setError('');
      } catch (e) {
        if (cancelled) return;
        if (e instanceof NotConfiguredError) setNotConfigured(true);
        else setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (account !== 'All' && r.account !== account) return false;
      if (maxFloat && r.match.float != null && r.match.float > Number(maxFloat)) return false;
      if (maxSteamPct && r.steamPct != null && r.steamPct > Number(maxSteamPct)) return false;
      return true;
    });
  }, [rows, account, maxFloat, maxSteamPct]);

  const filtersActive = !!(maxFloat || maxSteamPct || account !== 'All');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Best deals right now</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Live matches from your last sweep, sorted cheapest vs. Steam. Refreshes every 30s.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <FunnelIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <select
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        >
          <option>All</option>
          {ACCOUNTS.map((a) => <option key={a}>{a}</option>)}
        </select>
        <input
          value={maxFloat}
          onChange={(e) => setMaxFloat(e.target.value)}
          placeholder="max float"
          inputMode="decimal"
          className="w-28 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <input
          value={maxSteamPct}
          onChange={(e) => setMaxSteamPct(e.target.value)}
          placeholder="max steam %"
          inputMode="decimal"
          className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring"
        />
        {filtersActive && (
          <button
            onClick={() => { setAccount('All'); setMaxFloat(''); setMaxSteamPct(''); }}
            className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      {notConfigured && <div className="mt-5"><SetupBanner /></div>}
      {error && <div className="mt-5"><ErrorBanner message={error} /></div>}
      {!rows && !notConfigured && !error && (
        <div className="mt-8 space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-surface" />)}
        </div>
      )}

      {rows && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Skin</th>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Site</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Float</th>
                <th className="px-3 py-2 font-medium">vs Steam</th>
                <th className="px-3 py-2 font-medium">vs 3rd party</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.bot}:${r.watch.id}`} className="border-t border-border transition-colors hover:bg-surface/60">
                  <td className="px-3 py-2">
                    {r.watch.name} <span className="text-muted-foreground">({r.watch.exterior})</span>
                    {r.watch.stattrak && <span className="ml-1.5 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">ST</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.account}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.match.site}</td>
                  <td className="px-3 py-2 font-mono font-medium">${r.match.price.toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{r.match.float != null ? r.match.float.toFixed(4) : '—'}</td>
                  <td className="px-3 py-2 font-mono">
                    {r.steamPct != null ? <span className={r.steamPct < 75 ? 'text-success' : ''}>{r.steamPct}%</span> : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono">{r.thirdPct != null ? `${r.thirdPct}%` : '—'}</td>
                  <td className="px-3 py-2">
                    {r.match.url && (
                      <a
                        href={r.match.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
                      >
                        Open <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">No current matches under these filters.</p>
          )}
        </div>
      )}

      {rows && hiddenCount > 0 && (
        <p className="mt-4 text-xs text-muted-foreground/70">
          {hiddenCount} enabled watch{hiddenCount === 1 ? '' : 'es'} with no current match, hidden from this list.
        </p>
      )}
    </div>
  );
}
