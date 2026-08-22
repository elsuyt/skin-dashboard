'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { CartItem, BuyingConfig } from '@/lib/types';
import { SiteLogo } from '@/components/SiteLogo';
import {
  ShoppingCartIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon,
  ArrowTopRightOnSquareIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// The cart, docked to the deals page.
//
// Staging used to be a one-way trip: you pressed Add, nothing visibly changed,
// and buying meant navigating to /cart. This keeps the staged set in front of
// you and puts the spend button where the adding happens.
//
// It does not buy anything itself — Checkout enqueues `cart-checkout`, which
// the bot runs through checkout.buyCart(), the same function the Telegram
// confirm calls, with the same ENABLE_BUY / canBuy / MAX_BUY_USD guards. The
// arm-then-confirm here mirrors the two-tap rule every other spend follows.

const usd = (n: number) => `$${n.toFixed(2)}`;

export function CartBar({
  items,
  buying,
  pending,
  onRemove,
  onCheckout,
  queued,
}: {
  items: CartItem[];
  buying: BuyingConfig | null;
  pending: number;      // adds enqueued but not yet confirmed by the bot
  onRemove: (key: string) => void;
  onCheckout: () => void;
  queued: boolean;      // a checkout was sent and the bot has not reported back
}) {
  const [expanded, setExpanded] = useState(false);
  const [armed, setArmed] = useState(false);

  if (!items.length && !pending) return null;

  const buyable = items.filter((i) => i.canBuy);
  const manualOnly = items.filter((i) => !i.canBuy);
  const cap = buying?.maxBuyUsd;
  const willBuy = cap != null ? buyable.filter((i) => i.price <= cap) : buyable;
  const overCap = cap != null ? buyable.filter((i) => i.price > cap) : [];
  const willSpend = willBuy.reduce((s, i) => s + i.price, 0);
  const buyingOff = buying ? !buying.enabled : false;

  return (
    <div className="pointer-events-none sticky bottom-0 z-30 -mx-4 mt-6 px-4 pb-4 sm:-mx-6 sm:px-6">
      <div className="pointer-events-auto mx-auto max-w-5xl overflow-hidden rounded-xl border border-border bg-surface/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        {expanded && items.length > 0 && (
          <ul className="max-h-64 overflow-y-auto border-b border-border">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5 text-sm last:border-0">
                <SiteLogo site={i.site} withLabel={false} />
                <span className="min-w-0 flex-1 truncate">{i.name}</span>
                {i.float != null && <span className="tabular text-xs text-muted-foreground">{i.float.toFixed(4)}</span>}
                <span className="tabular font-medium">{usd(i.price)}</span>
                {i.lastError ? (
                  <span className="rounded bg-warning/12 px-1.5 py-0.5 text-[10px] font-medium text-warning" title={i.lastError}>
                    retrying
                  </span>
                ) : !i.canBuy ? (
                  <span className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] text-muted-foreground">buy on site</span>
                ) : null}
                {i.url && (
                  <a href={i.url} target="_blank" rel="noreferrer" className="text-muted-foreground transition-colors hover:text-primary" title="Open the listing">
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
                <button
                  onClick={() => onRemove(i.key)}
                  aria-label={`Remove ${i.name} from the cart`}
                  className="-m-2 grid h-9 w-9 cursor-pointer place-items-center text-muted-foreground transition-colors hover:text-destructive"
                >
                  <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            disabled={!items.length}
            aria-expanded={expanded}
            className="flex cursor-pointer items-center gap-2 text-sm font-medium transition-colors hover:text-primary disabled:cursor-default disabled:opacity-60"
          >
            <ShoppingCartIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            {items.length} in cart
            {pending > 0 && <span className="text-muted-foreground">· {pending} adding…</span>}
            {items.length > 0 &&
              (expanded ? <ChevronDownIcon className="h-4 w-4" aria-hidden="true" /> : <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />)}
          </button>

          <span className="text-sm text-muted-foreground">
            {willBuy.length > 0 ? <>will buy {willBuy.length} · <span className="tabular text-foreground">{usd(willSpend)}</span></> : 'nothing auto-buyable'}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/cart" className="text-xs text-muted-foreground transition-colors hover:text-primary">
              Full cart
            </Link>
            {buyingOff ? (
              <span className="flex items-center gap-1.5 text-xs text-warning" title="ENABLE_BUY=0 on this bot">
                <ExclamationTriangleIcon className="h-3.5 w-3.5" aria-hidden="true" /> buying disabled
              </span>
            ) : queued ? (
              <span className="text-xs text-muted-foreground">checkout sent — waiting for the bot…</span>
            ) : armed ? (
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Spend {usd(willSpend)}?</span>
                <button
                  onClick={() => { setArmed(false); onCheckout(); }}
                  className="min-h-9 cursor-pointer rounded-lg bg-destructive px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Confirm
                </button>
                <button onClick={() => setArmed(false)} className="min-h-9 cursor-pointer px-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setArmed(true)}
                disabled={!willBuy.length}
                className="min-h-9 cursor-pointer rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
                title={willBuy.length ? 'Runs the bot’s own buy loop' : 'Nothing in the cart can be bought automatically'}
              >
                Checkout
              </button>
            )}
          </div>
        </div>

        {(overCap.length > 0 || manualOnly.length > 0) && (
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            {overCap.length > 0 && <>{overCap.length} over the {usd(cap!)} per-item cap — skipped. </>}
            {manualOnly.length > 0 && <>{manualOnly.length} have no purchase path and stay staged for you to buy on the site.</>}
          </p>
        )}
      </div>
    </div>
  );
}
