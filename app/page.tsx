'use client';
import { useEffect, useMemo, useState } from 'react';
import { BOTS, ACCOUNTS, botByKey } from '@/lib/bots';
import { api } from '@/lib/api-client';
import type { WatchMatch, WatchItem } from '@/lib/types';

const WATCHLIST_BOTS = BOTS.filter((b) => b.kind === 'watchlist');

interface Row {
  bot: string;
  botLabel: string;
  account: string;
  watch: WatchItem;
  match: WatchMatch | null;
  steamPct: number | null;
  thirdPct: number | null;
}

function pct(price: number | null | undefined, ref: number | null | undefined) {
  if (price == null || ref == null || ref <= 0) return null;
  return Math.round((price / ref) * 100);
}

export default function BestDealsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
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
        results.forEach((state, i) => {
          const bot = WATCHLIST_BOTS[i];
          const matchByWatch = new Map(state.matches.map((m) => [m.watchId, m]));
          for (const watch of state.watches) {
            if (!watch.enabled) continue;
            const match = matchByWatch.get(watch.id) ?? null;
            next.push({
              bot: bot.key,
              botLabel: bot.label,
              account: bot.account,
              watch,
              match,
              steamPct: match ? pct(match.price, match.steamPrice) : null,
              thirdPct: match ? pct(match.price, match.thirdLowPrice) : null,
            });
          }
        });
        // Cheapest-relative-to-Steam first — that's "best" for this list.
        next.sort((a, b) => (a.steamPct ?? 999) - (b.steamPct ?? 999));
        setRows(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
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
      if (maxFloat && r.match?.float != null && r.match.float > Number(maxFloat)) return false;
      if (maxSteamPct && r.steamPct != null && r.steamPct > Number(maxSteamPct)) return false;
      return true;
    });
  }, [rows, account, maxFloat, maxSteamPct]);

  const withMatch = filtered.filter((r) => r.match);
  const withoutMatch = filtered.filter((r) => !r.match);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold">Best deals right now</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Live matches from your last sweep, sorted by cheapest vs. Steam. Updates every 30s.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <select
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
        >
          <option>All</option>
          {ACCOUNTS.map((a) => <option key={a}>{a}</option>)}
        </select>
        <input
          value={maxFloat}
          onChange={(e) => setMaxFloat(e.target.value)}
          placeholder="max float"
          className="w-28 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm placeholder:text-neutral-600"
        />
        <input
          value={maxSteamPct}
          onChange={(e) => setMaxSteamPct(e.target.value)}
          placeholder="max steam %"
          className="w-32 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm placeholder:text-neutral-600"
        />
        {(maxFloat || maxSteamPct || account !== 'All') && (
          <button
            onClick={() => { setAccount('All'); setMaxFloat(''); setMaxSteamPct(''); }}
            className="text-sm text-neutral-500 hover:text-neutral-200"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {!rows && !error && <p className="mt-8 text-sm text-neutral-500">Loading…</p>}

      {rows && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left text-neutral-400">
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
              {withMatch.map((r) => (
                <tr key={`${r.bot}:${r.watch.id}`} className="border-t border-neutral-800 hover:bg-neutral-900/50">
                  <td className="px-3 py-2">
                    {r.watch.name} <span className="text-neutral-500">({r.watch.exterior})</span>
                    {r.watch.stattrak && <span className="ml-1 rounded bg-amber-950 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">ST</span>}
                  </td>
                  <td className="px-3 py-2 text-neutral-400">{r.account}</td>
                  <td className="px-3 py-2 text-neutral-400">{r.match!.site}</td>
                  <td className="px-3 py-2 font-medium">${r.match!.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-neutral-400">{r.match!.float != null ? r.match!.float.toFixed(4) : '—'}</td>
                  <td className="px-3 py-2">
                    {r.steamPct != null ? <span className={r.steamPct < 75 ? 'text-emerald-400' : ''}>{r.steamPct}%</span> : '—'}
                  </td>
                  <td className="px-3 py-2">{r.thirdPct != null ? `${r.thirdPct}%` : '—'}</td>
                  <td className="px-3 py-2">
                    {r.match!.url && (
                      <a href={r.match!.url} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-neutral-100">
                        Open ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!withMatch.length && (
            <p className="px-3 py-8 text-center text-sm text-neutral-500">No current matches under these filters.</p>
          )}
        </div>
      )}

      {rows && withoutMatch.length > 0 && (
        <p className="mt-4 text-xs text-neutral-600">
          {withoutMatch.length} enabled watch{withoutMatch.length === 1 ? '' : 'es'} with no current match, hidden from this list.
        </p>
      )}
    </div>
  );
}
