'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { BOTS, ACCOUNTS } from '@/lib/bots';
import { api, NotConfiguredError } from '@/lib/api-client';
import { CartBar } from '@/components/CartBar';
import { SetupBanner, ErrorBanner } from '@/components/StateBanner';
import { SkinThumb } from '@/components/SkinThumb';
import { SiteLogo, SteamMark } from '@/components/SiteLogo';
import { Page, PageHead, StatCard, TableWrap, Th, Empty, Skeleton, Pill, inputClass } from '@/components/ui';
import type { WatchMatch, WatchItem, CartItem, BuyingConfig } from '@/lib/types';
import {
  ArrowTopRightOnSquareIcon, FunnelIcon, XMarkIcon, SparklesIcon, TagIcon,
  ShoppingCartIcon, CheckIcon, ChevronRightIcon, ChevronDownIcon, SwatchIcon,
} from '@heroicons/react/24/outline';

const WATCHLIST_BOTS = BOTS.filter((b) => b.kind === 'watchlist');

// The bot only holds a listing it can still stage for 60 minutes (state.cjs's
// getMatchListing TTL). Past that the listing is very likely gone from the
// market, so the row is shown as a stale sighting rather than a live deal.
const STALE_AFTER_MS = 60 * 60 * 1000;

interface Group {
  key: string;
  bot: string;
  account: string;
  watch: WatchItem;
  best: WatchMatch;          // cheapest
  bestFloat: WatchMatch | null; // lowest float, when it isn't the cheapest
  alternatives: WatchMatch[];
  steamPct: number | null;
  thirdPct: number | null;
  stale: boolean;
  ageMs: number;
  inCart: Set<string>; // matchIds already staged, straight from the bot
}

function pct(price: number | null | undefined, ref: number | null | undefined) {
  if (price == null || ref == null || ref <= 0) return null;
  return Math.round((price / ref) * 100);
}

function ageLabel(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(h < 10 ? 1 : 0)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// Green = a real discount to Steam, amber = fine but not a steal, plain =
// at or above Steam. Every pill also carries text, never colour alone.
function steamTone(p: number | null) {
  if (p == null) return 'muted' as const;
  if (p < 75) return 'success' as const;
  if (p < 95) return 'warning' as const;
  return 'muted' as const;
}

export default function BestDealsPage() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState('');
  const [account, setAccount] = useState<string>('All');
  const [maxFloat, setMaxFloat] = useState('');
  const [maxSteamPct, setMaxSteamPct] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [staged, setStaged] = useState<Set<string>>(new Set());
  // Cart of whichever bot you last staged from. The deals list spans both
  // snipers, but a cart belongs to one bot, so mixing them would produce a
  // checkout that silently only half-applies.
  const [cartBot, setCartBot] = useState<string>(WATCHLIST_BOTS[0].key);
  const [carts, setCarts] = useState<Record<string, CartItem[]>>({});
  const [buyingByBot, setBuyingByBot] = useState<Record<string, BuyingConfig | null>>({});
  const [checkoutQueued, setCheckoutQueued] = useState(false);
  // A staged item only appears once the bot has polled (≤30s) and pushed back
  // (≤30s). Without a faster window the page looked dead for up to a minute
  // after every Add, which is most of why the cart felt broken.
  const [boostUntil, setBoostUntil] = useState(0);

  async function addToCart(g: Group, m: WatchMatch) {
    setStaged((prev) => new Set(prev).add(m.matchId));
    setCartBot(g.bot);
    setBoostUntil(Date.now() + 90000);
    try {
      await api.addToCart(g.bot, g.watch.id, m.matchId);
    } catch (e) {
      setStaged((prev) => { const n = new Set(prev); n.delete(m.matchId); return n; });
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function removeFromCart(key: string) {
    setBoostUntil(Date.now() + 60000);
    try {
      await api.removeFromCart(cartBot, key);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function checkout() {
    setCheckoutQueued(true);
    setBoostUntil(Date.now() + 180000);
    try {
      await api.checkout(cartBot);
    } catch (e) {
      setCheckoutQueued(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const results = await Promise.all(WATCHLIST_BOTS.map((b) => api.getWatchlist(b.key)));
        if (cancelled) return;
        const next: Group[] = [];
        const nextCarts: Record<string, CartItem[]> = {};
        const nextBuying: Record<string, BuyingConfig | null> = {};
        let hidden = 0;

        results.forEach((state, i) => {
          const bot = WATCHLIST_BOTS[i];
          const byWatch = new Map<string, WatchMatch[]>();
          for (const m of state.matches) {
            const list = byWatch.get(m.watchId);
            if (list) list.push(m); else byWatch.set(m.watchId, [m]);
          }
          // cart.cjs keys every staged item as `${site}:${listing.id}` — the
          // same string recordMatches() uses for matchId, so this compares
          // like for like without inventing a second identity scheme.
          const inCart = new Set((state.cart ?? []).map((c) => c.key));
          nextCarts[bot.key] = state.cart ?? [];
          nextBuying[bot.key] = state.buying ?? null;

          for (const watch of state.watches) {
            if (!watch.enabled) continue;
            const list = (byWatch.get(watch.id) ?? []).slice().sort((a, b) => a.price - b.price);
            if (!list.length) { hidden++; continue; }

            const best = list[0];
            // The point of showing alternatives: a lower float is often only a
            // cent or two dearer, and the cheapest row alone hides it.
            const withFloat = list.filter((m) => m.float != null);
            const lowestFloat = withFloat.length
              ? withFloat.reduce((a, b) => (a.float! <= b.float! ? a : b))
              : null;

            next.push({
              key: `${bot.key}:${watch.id}`,
              bot: bot.key,
              account: bot.account,
              watch,
              best,
              bestFloat: lowestFloat && lowestFloat.matchId !== best.matchId ? lowestFloat : null,
              alternatives: list.slice(1),
              steamPct: pct(best.price, best.steamPrice),
              thirdPct: pct(best.price, best.thirdLowPrice),
              stale: Date.now() - best.seenAt > STALE_AFTER_MS,
              ageMs: Date.now() - best.seenAt,
              inCart,
            });
          }
        });

        next.sort((a, b) => (a.steamPct ?? 999) - (b.steamPct ?? 999));
        setGroups(next);
        setCarts(nextCarts);
        setBuyingByBot(nextBuying);
        // The bot has confirmed the stage, so drop the optimistic marker and
        // let the real cart drive the "in cart" state from here on.
        const confirmed = new Set(Object.values(nextCarts).flat().map((c) => c.key));
        setStaged((prev) => {
          const remaining = new Set([...prev].filter((id) => !confirmed.has(id)));
          return remaining.size === prev.size ? prev : remaining;
        });
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
    const fast = boostUntil && Date.now() < boostUntil;
    const id = setInterval(load, fast ? 3000 : 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [boostUntil]);

  const filtered = useMemo(() => {
    if (!groups) return [];
    return groups.filter((g) => {
      if (account !== 'All' && g.account !== account) return false;
      if (maxFloat && g.best.float != null && g.best.float > Number(maxFloat)) return false;
      if (maxSteamPct && g.steamPct != null && g.steamPct > Number(maxSteamPct)) return false;
      return true;
    });
  }, [groups, account, maxFloat, maxSteamPct]);

  const stats = useMemo(() => {
    const withPct = filtered.filter((g) => g.steamPct != null);
    const best = withPct.length ? Math.min(...withPct.map((g) => g.steamPct!)) : null;
    const under75 = withPct.filter((g) => g.steamPct! < 75).length;
    const staleCount = filtered.filter((g) => g.stale).length;
    const alts = filtered.reduce((s, g) => s + g.alternatives.length, 0);
    return { best, under75, staleCount, fresh: filtered.length - staleCount, alts };
  }, [filtered]);

  const filtersActive = !!(maxFloat || maxSteamPct || account !== 'All');

  function toggle(key: string) {
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  function stageCell(g: Group, m: WatchMatch) {
    if (!m.cartable) {
      return <span className="text-xs text-muted-foreground/50" title="This market has no purchase path — open it and buy there">—</span>;
    }
    // `stageable === false` means the bot has dropped the listing (over an hour
    // since the sweep that found it) and would refuse the add. Offering the
    // button anyway is what made the cart look broken, so say so instead.
    // `undefined` means the bot predates this flag — allow the attempt.
    if (m.stageable === false) {
      return (
        <span
          className="text-xs text-muted-foreground/60"
          title="Expired — the bot dropped this listing an hour after it was seen, so it has almost certainly been bought. It comes back if a sweep finds it again."
        >
          expired
        </span>
      );
    }
    if (g.inCart.has(m.matchId) || staged.has(m.matchId)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-success">
          <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> in cart
        </span>
      );
    }
    return (
      <button
        onClick={() => addToCart(g, m)}
        title="Stage this exact listing — spends nothing"
        className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-primary"
      >
        <ShoppingCartIcon className="h-3.5 w-3.5" aria-hidden="true" /> Add
      </button>
    );
  }

  return (
    <Page>
      <PageHead
        title="Best deals"
        count={groups ? filtered.length : undefined}
        subtitle="One row per skin, cheapest listing first. Expand a row to compare the other floats — a better float is often only a cent or two more."
      />

      {notConfigured && <div className="mt-6"><SetupBanner /></div>}
      {error && <div className="mt-6"><ErrorBanner message={error} /></div>}

      {groups && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Live matches"
            value={stats.fresh}
            icon={<SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />}
            hint={stats.staleCount ? `${stats.staleCount} older sighting${stats.staleCount === 1 ? '' : 's'} also shown` : 'all seen this hour'}
          />
          <StatCard
            label="Best vs Steam"
            value={stats.best != null ? `${stats.best}%` : '—'}
            tone={stats.best != null && stats.best < 75 ? 'success' : 'default'}
            icon={<SteamMark className="h-3.5 w-3.5" />}
            hint="lower is a better deal"
          />
          <StatCard label="Under 75% of Steam" value={stats.under75} tone="success" icon={<TagIcon className="h-3.5 w-3.5" aria-hidden="true" />} />
          <StatCard
            label="Other floats"
            value={stats.alts}
            icon={<SwatchIcon className="h-3.5 w-3.5" aria-hidden="true" />}
            hint="alternative listings behind these rows"
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <FunnelIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="f-account" className="sr-only">Account</label>
        <select id="f-account" value={account} onChange={(e) => setAccount(e.target.value)} className={`${inputClass} cursor-pointer`}>
          <option>All</option>
          {ACCOUNTS.map((a) => <option key={a}>{a}</option>)}
        </select>
        <label htmlFor="f-float" className="sr-only">Max float</label>
        <input id="f-float" value={maxFloat} onChange={(e) => setMaxFloat(e.target.value)} placeholder="max float" inputMode="decimal" className={`${inputClass} w-32 tabular`} />
        <label htmlFor="f-steam" className="sr-only">Max percent of Steam</label>
        <input id="f-steam" value={maxSteamPct} onChange={(e) => setMaxSteamPct(e.target.value)} placeholder="max steam %" inputMode="decimal" className={`${inputClass} w-36 tabular`} />
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

      {!groups && !notConfigured && !error && <div className="mt-6"><Skeleton /></div>}

      {groups && (
        <div className="mt-4">
          <TableWrap maxHeight="70vh">
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
                  <Th right>Seen</Th>
                  <Th right />
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => {
                  const isOpen = open.has(g.key);
                  return (
                    <Fragment key={g.key}>
                      <tr className={`border-b border-border/60 transition-colors hover:bg-surface-hover/50 ${g.stale ? 'opacity-55' : ''}`}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            {g.alternatives.length > 0 ? (
                              <button
                                onClick={() => toggle(g.key)}
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? 'Hide' : 'Show'} ${g.alternatives.length} other listing${g.alternatives.length === 1 ? '' : 's'} for ${g.watch.name}`}
                                // 44x44 hit area (the accessibility minimum) with a
                                // negative margin so the row's layout is unchanged.
                                className="-m-3 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:text-foreground [touch-action:manipulation]"
                              >
                                {isOpen
                                  ? <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                                  : <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />}
                              </button>
                            ) : (
                              <span className="w-5 shrink-0" aria-hidden="true" />
                            )}
                            <SkinThumb image={g.watch.image} name={g.watch.name} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-medium">{g.watch.name}</span>
                                {g.watch.stattrak && (
                                  <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">ST</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {g.watch.exterior}
                                {g.alternatives.length > 0 && (
                                  <span className="text-muted-foreground/70"> · {g.alternatives.length + 1} listings</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{g.account}</td>
                        <td className="px-4 py-2.5"><SiteLogo site={g.best.site} /></td>
                        <td className="px-4 py-2.5 text-right font-medium tabular">${g.best.price.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right tabular">
                          {g.best.float != null ? g.best.float.toFixed(4) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {g.steamPct != null ? <Pill tone={steamTone(g.steamPct)}>{g.steamPct}%</Pill> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground tabular">
                          {g.thirdPct != null ? `${g.thirdPct}%` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs">
                          <span className={g.stale ? 'text-warning' : 'text-muted-foreground'}>{ageLabel(g.ageMs)}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <span className="mr-3">{stageCell(g, g.best)}</span>
                          {g.best.url && (
                            <a
                              href={g.best.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
                            >
                              Open <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          )}
                        </td>
                      </tr>

                      {/* A better float for a few cents is the whole reason this
                          expands, so each alternative states its delta outright. */}
                      {isOpen && g.alternatives.map((m) => {
                        const dPrice = m.price - g.best.price;
                        const dFloat = m.float != null && g.best.float != null ? m.float - g.best.float : null;
                        const isBestFloat = g.bestFloat?.matchId === m.matchId;
                        return (
                          <tr key={m.matchId} className="border-b border-border/60 bg-surface/30 text-xs">
                            <td className="py-2 pl-16 pr-4">
                              <span className="text-muted-foreground">
                                {isBestFloat ? 'Lowest float of this set' : 'Alternative listing'}
                              </span>
                              {isBestFloat && (
                                <span className="ml-2 rounded bg-success/12 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                                  best float
                                </span>
                              )}
                            </td>
                            <td />
                            <td className="px-4 py-2"><SiteLogo site={m.site} withLabel={false} /></td>
                            <td className="px-4 py-2 text-right tabular">
                              ${m.price.toFixed(2)}
                              {dPrice > 0 && <span className="ml-1.5 text-warning">+${dPrice.toFixed(2)}</span>}
                            </td>
                            <td className="px-4 py-2 text-right tabular">
                              {m.float != null ? m.float.toFixed(4) : '—'}
                              {dFloat != null && dFloat < 0 && (
                                <span className="ml-1.5 text-success">{dFloat.toFixed(4)}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right tabular text-muted-foreground">
                              {pct(m.price, m.steamPrice) != null ? `${pct(m.price, m.steamPrice)}%` : '—'}
                            </td>
                            <td className="px-4 py-2 text-right tabular text-muted-foreground">
                              {pct(m.price, m.thirdLowPrice) != null ? `${pct(m.price, m.thirdLowPrice)}%` : '—'}
                            </td>
                            <td />
                            <td className="whitespace-nowrap px-4 py-2 text-right">
                              <span className="mr-3">{stageCell(g, m)}</span>
                              {m.url && (
                                <a href={m.url} target="_blank" rel="noreferrer" className="text-muted-foreground transition-colors hover:text-primary">
                                  Open
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
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

      {groups && hiddenCount > 0 && (
        <p className="mt-3 text-xs text-muted-foreground/60">
          {hiddenCount} enabled watch{hiddenCount === 1 ? '' : 'es'} had no match in the last sweep and {hiddenCount === 1 ? 'is' : 'are'} hidden here.
        </p>
      )}
      <CartBar
        items={carts[cartBot] ?? []}
        buying={buyingByBot[cartBot] ?? null}
        pending={[...staged].length}
        onRemove={removeFromCart}
        onCheckout={checkout}
        queued={checkoutQueued}
      />
    </Page>
  );
}
