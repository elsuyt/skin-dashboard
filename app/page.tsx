'use client';
import { useEffect, useMemo, useState } from 'react';
import { BOTS, ACCOUNTS } from '@/lib/bots';
import { api, NotConfiguredError } from '@/lib/api-client';
import { SetupBanner, ErrorBanner } from '@/components/StateBanner';
import { SkinThumb } from '@/components/SkinThumb';
import { SiteLogo, SteamMark } from '@/components/SiteLogo';
import {
  Page, PageHead, StatCard, TableWrap, Th, Empty, Skeleton, Pill, inputClass,
} from '@/components/ui';
import type { WatchMatch, WatchItem } from '@/lib/types';
import { ArrowTopRightOnSquareIcon, FunnelIcon, XMarkIcon, SparklesIcon, TagIcon, ShoppingCartIcon, CheckIcon } from '@heroicons/react/24/outline';

const WATCHLIST_BOTS = BOTS.filter((b) => b.kind === 'watchlist');

interface Row {
  bot: string;
  account: string;
  watch: WatchItem;
  match: WatchMatch;
  steamPct: number | null;
  thirdPct: number | null;
  // Staging is only offered when the bot still holds a buyable listing for
  // this watch AND that market can actually be purchased from. Tradeit has
  // no buy path at all, so it never gets a button.
  canStage: boolean;
  inCart: boolean;
}

function pct(price: number | null | undefined, ref: number | null | undefined) {
  if (price == null || ref == null || ref <= 0) return null;
  return Math.round((price / ref) * 100);
}

// The colour has to mean the same thing everywhere: green = a real discount to
// Steam, amber = fine but not a steal, plain = at or above Steam.
function steamTone(p: number | null) {
  if (p == null) return 'muted' as const;
  if (p < 75) return 'success' as const;
  if (p < 95) return 'warning' as const;
  return 'muted' as const;
}

export default function BestDealsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState('');
  const [account, setAccount] = useState<string>('All');
  const [maxFloat, setMaxFloat] = useState('');
  const [maxSteamPct, setMaxSteamPct] = useState('');
  // Optimistic: the bot only applies the command on its next sync (~30s), so
  // without this the button would look like it did nothing for half a minute.
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  async function addToCart(r: Row) {
    setJustAdded((prev) => new Set(prev).add(`${r.bot}:${r.watch.id}`));
    try {
      await api.addToCart(r.bot, r.watch.id);
    } catch (e) {
      setJustAdded((prev) => {
        const next = new Set(prev);
        next.delete(`${r.bot}:${r.watch.id}`);
        return next;
      });
      setError(e instanceof Error ? e.message : String(e));
    }
  }

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
          const buyable = new Set(state.buying?.buyableSites ?? []);
          const staged = new Set((state.cart ?? []).map((c) => `${c.site}:${c.watchId}`));
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
              canStage: !!match.cartable && buyable.has(match.site),
              inCart: staged.has(`${match.site}:${watch.id}`),
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

  const stats = useMemo(() => {
    const withPct = filtered.filter((r) => r.steamPct != null);
    const best = withPct.length ? Math.min(...withPct.map((r) => r.steamPct!)) : null;
    const under75 = withPct.filter((r) => r.steamPct! < 75).length;
    const value = filtered.reduce((s, r) => s + r.match.price, 0);
    return { best, under75, value, total: filtered.length };
  }, [filtered]);

  const filtersActive = !!(maxFloat || maxSteamPct || account !== 'All');

  return (
    <Page>
      <PageHead
        title="Best deals"
        count={rows ? filtered.length : undefined}
        subtitle="Live matches from each bot's last sweep, cheapest against Steam first. Refreshes every 30 seconds."
      />

      {notConfigured && <div className="mt-6"><SetupBanner /></div>}
      {error && <div className="mt-6"><ErrorBanner message={error} /></div>}

      {rows && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Live matches" value={stats.total} icon={<SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />} />
          <StatCard
            label="Best vs Steam"
            value={stats.best != null ? `${stats.best}%` : '—'}
            tone={stats.best != null && stats.best < 75 ? 'success' : 'default'}
            icon={<SteamMark className="h-3.5 w-3.5" />}
            hint="lower is a better deal"
          />
          <StatCard label="Under 75% of Steam" value={stats.under75} tone="success" icon={<TagIcon className="h-3.5 w-3.5" aria-hidden="true" />} />
          <StatCard label="Combined ask" value={`$${stats.value.toFixed(2)}`} hint="if you bought every row" />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <FunnelIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <select value={account} onChange={(e) => setAccount(e.target.value)} className={`${inputClass} cursor-pointer`}>
          <option>All</option>
          {ACCOUNTS.map((a) => <option key={a}>{a}</option>)}
        </select>
        <input value={maxFloat} onChange={(e) => setMaxFloat(e.target.value)} placeholder="max float" inputMode="decimal" className={`${inputClass} w-32 tabular`} />
        <input value={maxSteamPct} onChange={(e) => setMaxSteamPct(e.target.value)} placeholder="max steam %" inputMode="decimal" className={`${inputClass} w-36 tabular`} />
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

      {!rows && !notConfigured && !error && <div className="mt-6"><Skeleton /></div>}

      {rows && (
        <div className="mt-4">
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface/60">
                <tr>
                  <Th>Skin</Th>
                  <Th>Account</Th>
                  <Th>Market</Th>
                  <Th right>Price</Th>
                  <Th right>Float</Th>
                  <Th right>vs Steam</Th>
                  <Th right>vs 3rd party</Th>
                  <Th right />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={`${r.bot}:${r.watch.id}`} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-hover/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <SkinThumb image={r.watch.image} name={r.watch.name} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">{r.watch.name}</span>
                            {r.watch.stattrak && (
                              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">ST</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{r.watch.exterior}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{r.account}</td>
                    <td className="px-4 py-2.5"><SiteLogo site={r.match.site} /></td>
                    <td className="px-4 py-2.5 text-right font-medium tabular">${r.match.price.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular">
                      {r.match.float != null ? r.match.float.toFixed(4) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.steamPct != null ? <Pill tone={steamTone(r.steamPct)}>{r.steamPct}%</Pill> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular">
                      {r.thirdPct != null ? `${r.thirdPct}%` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {r.canStage && (
                        r.inCart || justAdded.has(`${r.bot}:${r.watch.id}`) ? (
                          <span className="mr-3 inline-flex items-center gap-1 text-xs text-success">
                            <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> in cart
                          </span>
                        ) : (
                          <button
                            onClick={() => addToCart(r)}
                            title="Stage this listing on the bot — spends nothing"
                            className="mr-3 inline-flex cursor-pointer items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
                          >
                            <ShoppingCartIcon className="h-3.5 w-3.5" aria-hidden="true" /> Add
                          </button>
                        )
                      )}
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
              <Empty icon={<SparklesIcon className="h-7 w-7 text-muted-foreground/40" aria-hidden="true" />}>
                No current matches under these filters.
              </Empty>
            )}
          </TableWrap>
        </div>
      )}

      {rows && hiddenCount > 0 && (
        <p className="mt-3 text-xs text-muted-foreground/60">
          {hiddenCount} enabled watch{hiddenCount === 1 ? '' : 'es'} had no match in the last sweep and {hiddenCount === 1 ? 'is' : 'are'} hidden here.
        </p>
      )}
    </Page>
  );
}
