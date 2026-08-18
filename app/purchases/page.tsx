'use client';
import { useEffect, useMemo, useState } from 'react';
import { BOTS } from '@/lib/bots';
import { api, NotConfiguredError } from '@/lib/api-client';
import { SetupBanner, ErrorBanner } from '@/components/StateBanner';
import { SkinThumb } from '@/components/SkinThumb';
import { SiteLogo } from '@/components/SiteLogo';
import {
  Page, PageHead, StatCard, TableWrap, Th, Empty, Skeleton, Pill,
} from '@/components/ui';
import type { Purchase } from '@/lib/types';
import { ShoppingBagIcon, BoltIcon, CursorArrowRaysIcon, BanknotesIcon } from '@heroicons/react/24/outline';

const WATCHLIST_BOTS = BOTS.filter((b) => b.kind === 'watchlist');

interface Row extends Purchase {
  bot: string;
  account: string;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

// The bots record the full market hash name ("StatTrak™ AK-47 | Redline
// (Field-Tested)"), which already carries the exterior — printing that next to
// the separate exterior field showed it twice. Split it so the row reads as
// name + exterior, and fall back to the recorded field for older records whose
// name had no suffix.
const EXTERIOR_RE = /\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i;
const QUALIFIER_RE = /^(★\s*)?(StatTrak™|StatTrak|Souvenir)\s*/i;

function splitName(name: string, recordedExterior: string) {
  const m = name.match(EXTERIOR_RE);
  const base = m ? name.slice(0, m.index).trim() : name.trim();
  return {
    base: base.replace(QUALIFIER_RE, '').trim() || base,
    exterior: (m ? m[1] : recordedExterior) || '',
    stattrak: /^(★\s*)?(StatTrak™|StatTrak)\s/i.test(base),
  };
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

  const stats = useMemo(() => {
    const spent = filtered.reduce((s, r) => s + r.price, 0);
    const auto = filtered.filter((r) => r.via === 'auto').length;
    const day = Date.now() - 86_400_000;
    const spent24h = filtered.filter((r) => r.at >= day).reduce((s, r) => s + r.price, 0);
    return { spent, auto, manual: filtered.length - auto, count: filtered.length, spent24h };
  }, [filtered]);

  return (
    <Page>
      <PageHead
        title="Purchases"
        count={rows ? filtered.length : undefined}
        subtitle="Everything actually bought across both sniper bots — auto-buys and manual confirms, newest first."
      />

      {notConfigured && <div className="mt-6"><SetupBanner /></div>}
      {error && <div className="mt-6"><ErrorBanner message={error} /></div>}

      {rows && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total spent" value={money(stats.spent)} icon={<BanknotesIcon className="h-3.5 w-3.5" aria-hidden="true" />} />
            <StatCard label="Spent last 24h" value={money(stats.spent24h)} hint="across both bots" />
            <StatCard label="Auto-bought" value={stats.auto} tone="accent" icon={<BoltIcon className="h-3.5 w-3.5" aria-hidden="true" />} hint="no confirmation tap" />
            <StatCard label="Manual" value={stats.manual} icon={<CursorArrowRaysIcon className="h-3.5 w-3.5" aria-hidden="true" />} hint="you confirmed these" />
          </div>

          <div className="mt-6 flex gap-2">
            {(['all', 'auto', 'manual'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVia(v)}
                className={`cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium capitalize transition-colors ${
                  via === v
                    ? 'bg-surface-hover text-foreground ring-1 ring-border-strong'
                    : 'text-muted-foreground hover:bg-surface hover:text-foreground'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </>
      )}

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
                  <Th right>Paid</Th>
                  <Th right>Float</Th>
                  <Th>How</Th>
                  <Th right>When</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={`${r.bot}:${r.id}`} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-hover/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <SkinThumb image={r.image} name={r.name} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">{splitName(r.name, r.exterior).base}</span>
                            {splitName(r.name, r.exterior).stattrak && (
                              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">ST</span>
                            )}
                          </div>
                          {splitName(r.name, r.exterior).exterior && (
                            <p className="text-xs text-muted-foreground">{splitName(r.name, r.exterior).exterior}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{r.account}</td>
                    <td className="px-4 py-2.5"><SiteLogo site={r.site} /></td>
                    <td className="px-4 py-2.5 text-right font-medium tabular">{money(r.price)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular">{r.float != null ? r.float.toFixed(4) : '—'}</td>
                    <td className="px-4 py-2.5">
                      {r.via === 'auto' ? (
                        <Pill tone="accent">auto{r.steamPct != null ? ` · ${r.steamPct}% steam` : ''}</Pill>
                      ) : (
                        <Pill tone="muted">manual</Pill>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-muted-foreground">
                      {new Date(r.at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <Empty icon={<ShoppingBagIcon className="h-7 w-7 text-muted-foreground/40" aria-hidden="true" />}>
                Nothing bought yet under this filter. New buys appear here within a minute.
              </Empty>
            )}
          </TableWrap>
        </div>
      )}
    </Page>
  );
}
