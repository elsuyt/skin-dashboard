'use client';
import { useEffect, useState } from 'react';
import { BOTS } from '@/lib/bots';
import { api, NotConfiguredError } from '@/lib/api-client';
import { SetupBanner, ErrorBanner } from '@/components/StateBanner';
import type { OrderItem } from '@/lib/types';
import {
  ArrowPathIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const ORDER_BOTS = BOTS.filter((b) => b.kind === 'orders');

function money(cents: number | null) {
  return cents == null ? '—' : `$${(cents / 100).toFixed(2)}`;
}

const STATUS_STYLE: Record<string, string> = {
  top: 'text-success',
  outbid: 'text-warning',
  ceiling: 'text-destructive',
  pending: 'text-muted-foreground',
  error: 'text-destructive',
};

function timeUntil(ts: number | null) {
  if (ts == null) return null;
  const ms = ts - Date.now();
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.round(ms / 60_000)}m`;
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export default function OrdersPage() {
  const [botKey, setBotKey] = useState(ORDER_BOTS[0].key);
  const [orders, setOrders] = useState<OrderItem[] | null>(null);
  const [accountBlocked, setAccountBlocked] = useState<string | null>(null);
  const [session, setSession] = useState<import('@/lib/types').SessionStatus | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshQueued, setRefreshQueued] = useState(false);

  async function load() {
    try {
      const state = await api.getOrders(botKey);
      setOrders(state.orders);
      setAccountBlocked(state.accountBlocked);
      setSession(state.session);
      setUpdatedAt(state.updatedAt);
      setNotConfigured(false);
      setError('');
    } catch (e) {
      if (e instanceof NotConfiguredError) setNotConfigured(true);
      else setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    setOrders(null);
    setConfirmId(null);
    setRefreshQueued(false);
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botKey]);

  async function confirmRebid(o: OrderItem) {
    if (o.highestCents == null) return;
    const target = o.highestCents + 1;
    const raiseCeiling = target > o.maxCents;
    await api.placeOrder(botKey, o.id, target, raiseCeiling);
    setConfirmId(null);
    setTimeout(load, 4000);
  }

  async function cancel(o: OrderItem) {
    if (!confirm(`Cancel your ${money(o.myCents)} order on ${o.hashName}? This is real, immediate, on Steam.`)) return;
    await api.cancelOrder(botKey, o.id);
    setTimeout(load, 4000);
  }

  async function refreshSession() {
    setRefreshing(true);
    try {
      await api.refreshSession(botKey);
      setRefreshQueued(true);
      setTimeout(load, 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }

  const accessLeft = session ? timeUntil(session.accessTokenExpiresAt) : null;
  const refreshLeft = session ? timeUntil(session.refreshTokenExpiresAt) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Buy orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Real Steam wallet money. Placing/cancelling here queues the exact same action your Telegram buttons trigger —
        same guards, same two-step confirm, just from here instead.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {ORDER_BOTS.map((b) => (
          <button
            key={b.key}
            onClick={() => setBotKey(b.key)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              botKey === b.key ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-surface hover:text-foreground'
            }`}
          >
            {b.label} <span className="opacity-70">({b.account})</span>
          </button>
        ))}
      </div>

      {notConfigured && <div className="mt-5"><SetupBanner /></div>}
      {error && <div className="mt-5"><ErrorBanner message={error} /></div>}

      {accountBlocked && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          <ShieldExclamationIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">Account-level problem — auto-rebid/refill paused</p>
            <p className="mt-0.5 text-muted-foreground">{accountBlocked}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              This clears on the bot&apos;s own restart once you&apos;ve fixed the cause — nothing here can override it.
            </p>
          </div>
        </div>
      )}

      {!notConfigured && (session || true) && (
        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm">
          {session ? (
            <>
              <span className="flex items-center gap-1.5 text-foreground">
                {accessLeft === 'expired' ? (
                  <ShieldExclamationIcon className="h-4 w-4 text-destructive" aria-hidden="true" />
                ) : (
                  <CheckCircleIcon className="h-4 w-4 text-success" aria-hidden="true" />
                )}
                Steam session: access token {accessLeft === 'expired' ? <span className="text-destructive">expired</span> : <span className="font-mono">{accessLeft} left</span>}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ClockIcon className="h-4 w-4" aria-hidden="true" />
                refresh token <span className="font-mono">{refreshLeft ?? '—'} left</span>
              </span>
              <span className="text-muted-foreground/70">{session.autoRenewOn ? 'auto-renew on' : 'auto-renew not configured'}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Session status unavailable — this bot hasn&apos;t reported one yet.</span>
          )}
          <button
            onClick={refreshSession}
            disabled={refreshing || refreshQueued}
            className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:cursor-default disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {refreshQueued ? 'Queued — applies next sync' : 'Refresh steamLoginSecure'}
          </button>
        </div>
      )}

      {updatedAt > 0 && (
        <p className="mt-4 text-xs text-muted-foreground/70">bot last synced {new Date(updatedAt).toLocaleTimeString()}</p>
      )}

      {!orders && !notConfigured && !error && (
        <div className="mt-6 space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-surface" />)}
        </div>
      )}

      {orders && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Skin</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Mine</th>
                <th className="px-3 py-2 font-medium">Top bid</th>
                <th className="px-3 py-2 font-medium">Lowest ask</th>
                <th className="px-3 py-2 font-medium">Ceiling</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border transition-colors hover:bg-surface/60">
                  <td className="px-3 py-2">{o.hashName}</td>
                  <td className={`px-3 py-2 font-medium ${STATUS_STYLE[o.status] ?? ''}`}>{o.status}</td>
                  <td className="px-3 py-2 font-mono">{money(o.myCents)}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{money(o.highestCents)}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{money(o.lowestSellCents)}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{money(o.maxCents)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {o.status === 'outbid' && o.highestCents != null && (
                      confirmId === o.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-muted-foreground">place at {money(o.highestCents + 1)}?</span>
                          <button onClick={() => confirmRebid(o)} className="cursor-pointer rounded bg-success px-2 py-1 text-xs font-medium text-success-foreground hover:opacity-90">
                            Yes
                          </button>
                          <button onClick={() => setConfirmId(null)} className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmId(o.id)} className="mr-3 cursor-pointer text-success hover:opacity-80">
                          Re-bid
                        </button>
                      )
                    )}
                    {o.myCents != null && (
                      <button onClick={() => cancel(o)} className="cursor-pointer text-muted-foreground hover:text-destructive">
                        Cancel order
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && <p className="px-3 py-10 text-center text-sm text-muted-foreground">No orders in this book yet.</p>}
        </div>
      )}
    </div>
  );
}
