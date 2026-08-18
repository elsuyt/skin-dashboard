'use client';
import { useEffect, useState } from 'react';
import { BOTS } from '@/lib/bots';
import { api, NotConfiguredError } from '@/lib/api-client';
import { SetupBanner, ErrorBanner } from '@/components/StateBanner';
import { SkinThumb } from '@/components/SkinThumb';
import { SiteLogo } from '@/components/SiteLogo';
import {
  Page, PageHead, StatCard, TableWrap, Th, Empty, Skeleton, Pill, btnGhost,
} from '@/components/ui';
import type { CartItem, BuyingConfig } from '@/lib/types';
import {
  ShoppingCartIcon, TrashIcon, ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon, LockClosedIcon, BanknotesIcon,
} from '@heroicons/react/24/outline';

const WATCHLIST_BOTS = BOTS.filter((b) => b.kind === 'watchlist');

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function CartPage() {
  const [botKey, setBotKey] = useState(WATCHLIST_BOTS[0].key);
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [buying, setBuying] = useState<BuyingConfig | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState('');
  const [armed, setArmed] = useState(false);
  const [queued, setQueued] = useState(false);

  async function load() {
    try {
      const state = await api.getWatchlist(botKey);
      setItems(state.cart ?? []);
      setBuying(state.buying ?? null);
      setUpdatedAt(state.updatedAt);
      setNotConfigured(false);
      setError('');
    } catch (e) {
      if (e instanceof NotConfiguredError) setNotConfigured(true);
      else setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    setItems(null);
    setArmed(false);
    setQueued(false);
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botKey]);

  async function remove(key: string) {
    await api.removeFromCart(botKey, key);
    setTimeout(load, 3000);
  }

  async function clearAll() {
    if (!confirm('Empty this cart? Nothing is bought — it just unstages everything.')) return;
    await api.clearCart(botKey);
    setTimeout(load, 3000);
  }

  async function checkout() {
    try {
      await api.checkout(botKey);
      setArmed(false);
      setQueued(true);
      setTimeout(load, 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const list = items ?? [];
  const buyable = list.filter((i) => i.canBuy);
  const manualOnly = list.filter((i) => !i.canBuy);
  const total = buyable.reduce((s, i) => s + i.price, 0);
  const cap = buying?.maxBuyUsd;
  const overCap = cap != null ? buyable.filter((i) => i.price > cap) : [];
  const willBuy = cap != null ? buyable.filter((i) => i.price <= cap) : buyable;
  const willSpend = willBuy.reduce((s, i) => s + i.price, 0);
  const buyingOff = buying ? !buying.enabled : false;

  return (
    <Page>
      <PageHead
        title="Cart"
        count={items?.length}
        subtitle="Items staged on the bot, not yet bought. Checkout runs the bot's own buy loop — the same one the Telegram confirm uses, with the same caps."
        actions={
          list.length ? (
            <button onClick={clearAll} className={btnGhost}>
              <TrashIcon className="h-4 w-4" aria-hidden="true" />
              Empty cart
            </button>
          ) : undefined
        }
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {WATCHLIST_BOTS.map((b) => (
          <button
            key={b.key}
            onClick={() => setBotKey(b.key)}
            className={`cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              botKey === b.key
                ? 'bg-surface-hover text-foreground ring-1 ring-border-strong'
                : 'text-muted-foreground hover:bg-surface hover:text-foreground'
            }`}
          >
            {b.label} <span className="text-muted-foreground/70">· {b.account}</span>
          </button>
        ))}
      </div>

      {notConfigured && <div className="mt-6"><SetupBanner /></div>}
      {error && <div className="mt-6"><ErrorBanner message={error} /></div>}

      {items && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Staged" value={list.length} icon={<ShoppingCartIcon className="h-3.5 w-3.5" aria-hidden="true" />} />
          <StatCard label="Buyable here" value={buyable.length} hint={manualOnly.length ? `${manualOnly.length} need buying on the site` : undefined} />
          <StatCard label="Would spend" value={money(willSpend)} tone={willSpend > 0 ? 'accent' : 'default'} hint={cap != null ? `cap ${money(cap)} per item` : undefined} />
          <StatCard
            label="Buying"
            value={buying ? (buying.enabled ? 'armed' : 'off') : '—'}
            // No report yet is "unknown", not "disabled" — showing it red would
            // claim the bot refuses to buy when it simply hasn't synced.
            tone={!buying ? 'default' : buying.enabled ? 'success' : 'destructive'}
            icon={<BanknotesIcon className="h-3.5 w-3.5" aria-hidden="true" />}
            hint={buying ? (buying.enabled ? 'ENABLE_BUY=1' : 'ENABLE_BUY=0') : 'bot has not reported yet'}
          />
        </div>
      )}

      {buyingOff && list.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <LockClosedIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">Buying is disabled on this bot</p>
            <p className="mt-0.5 text-muted-foreground">
              Checkout will be refused until <code className="rounded bg-surface px-1 py-0.5 text-xs">ENABLE_BUY=1</code> in that bot&apos;s
              <code className="ml-1 rounded bg-surface px-1 py-0.5 text-xs">.env</code>. Staging still works.
            </p>
          </div>
        </div>
      )}

      {overCap.length > 0 && cap != null && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="font-medium">{overCap.length} item{overCap.length === 1 ? '' : 's'} over the per-item cap of {money(cap)}</p>
            <p className="mt-0.5 text-muted-foreground">
              The bot will skip {overCap.length === 1 ? 'it' : 'them'} at checkout rather than buy over your MAX_BUY_USD.
            </p>
          </div>
        </div>
      )}

      {!items && !notConfigured && !error && <div className="mt-6"><Skeleton rows={4} /></div>}

      {items && (
        <div className="mt-4">
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface/60">
                <tr>
                  <Th>Skin</Th>
                  <Th>Market</Th>
                  <Th right>Price</Th>
                  <Th right>Float</Th>
                  <Th>At checkout</Th>
                  <Th right />
                </tr>
              </thead>
              <tbody>
                {list.map((it) => {
                  const over = cap != null && it.price > cap;
                  return (
                    <tr key={it.key} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-hover/50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <SkinThumb image={it.image} name={it.name} />
                          <span className="truncate font-medium">{it.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><SiteLogo site={it.site} /></td>
                      <td className="px-4 py-2.5 text-right font-medium tabular">{money(it.price)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground tabular">
                        {it.float != null ? it.float.toFixed(4) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {!it.canBuy ? (
                          <Pill tone="muted">buy on site</Pill>
                        ) : over ? (
                          <Pill tone="warning">over cap</Pill>
                        ) : buyingOff ? (
                          <Pill tone="destructive">blocked</Pill>
                        ) : (
                          <Pill tone="success">will buy</Pill>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        {it.url && (
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mr-3 inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
                          >
                            Open <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        )}
                        <button
                          onClick={() => remove(it.key)}
                          className="inline-flex cursor-pointer items-center gap-1 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!list.length && (
              <Empty icon={<ShoppingCartIcon className="h-7 w-7 text-muted-foreground/40" aria-hidden="true" />}>
                Nothing staged. Add items from Best deals — staging spends nothing.
              </Empty>
            )}
          </TableWrap>
        </div>
      )}

      {/* Checkout is deliberately two steps, matching the bots' Telegram rule
          that anything spending real money needs arming and then confirming. */}
      {items && willBuy.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface/50 px-4 py-4">
          <div>
            <p className="text-sm font-medium">
              {willBuy.length} item{willBuy.length === 1 ? '' : 's'} will be bought · <span className="tabular">{money(willSpend)}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Real money on the bot&apos;s own accounts. It runs on the bot&apos;s next sync, within ~30s, and reports to Telegram.
            </p>
          </div>

          {queued ? (
            <span className="text-sm text-success">Checkout queued — watch Telegram for the result.</span>
          ) : armed ? (
            <div className="flex items-center gap-2">
              <button
                onClick={checkout}
                disabled={buyingOff}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-destructive px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50"
              >
                Confirm — buy {willBuy.length} for {money(willSpend)}
              </button>
              <button onClick={() => setArmed(false)} className="cursor-pointer px-2 text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setArmed(true)}
              disabled={buyingOff}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50"
            >
              <ShoppingCartIcon className="h-4 w-4" aria-hidden="true" />
              Check out {money(willSpend)}
            </button>
          )}
        </div>
      )}

      {updatedAt > 0 && (
        <p className="mt-3 text-xs text-muted-foreground/60">bot last synced {new Date(updatedAt).toLocaleTimeString()}</p>
      )}
    </Page>
  );
}
