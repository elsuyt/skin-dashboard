'use client';
import { useEffect, useState } from 'react';
import { BOTS } from '@/lib/bots';
import { api, NotConfiguredError } from '@/lib/api-client';
import { SetupBanner, ErrorBanner } from '@/components/StateBanner';
import { SkinThumb } from '@/components/SkinThumb';
import { SteamMark } from '@/components/SiteLogo';
import { SessionPanel } from '@/components/SessionPanel';
import {
  Page, PageHead, StatCard, TableWrap, Th, Empty, Skeleton, Pill,
} from '@/components/ui';
import type { OrderItem, OrderStatus, SessionStatus } from '@/lib/types';
import { ShieldExclamationIcon, BanknotesIcon } from '@heroicons/react/24/outline';

const ORDER_BOTS = BOTS.filter((b) => b.kind === 'orders');

function money(cents: number | null) {
  return cents == null ? '—' : `$${(cents / 100).toFixed(2)}`;
}

const STATUS_TONE: Record<OrderStatus, 'success' | 'warning' | 'destructive' | 'muted'> = {
  top: 'success',
  outbid: 'warning',
  ceiling: 'destructive',
  error: 'destructive',
  pending: 'muted',
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
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

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

  const accessLeft = session ? timeUntil(session.accessTokenExpiresAt) : null;
  const refreshLeft = session ? timeUntil(session.refreshTokenExpiresAt) : null;
  const live = (orders ?? []).filter((o) => o.myCents != null);
  const committed = live.reduce((s, o) => s + (o.myCents ?? 0), 0);
  const outbid = (orders ?? []).filter((o) => o.status === 'outbid').length;

  return (
    <Page>
      <PageHead
        title="Buy orders"
        count={orders?.length}
        subtitle="Real Steam wallet money. Placing or cancelling here queues the same action your Telegram buttons trigger — same guards, same confirms."
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {ORDER_BOTS.map((b) => (
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

      {accountBlocked && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3.5 text-sm">
          <ShieldExclamationIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">Account-level problem — auto-rebid and auto-refill are paused</p>
            <p className="mt-0.5 text-muted-foreground">{accountBlocked}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              This clears on the bot&apos;s own restart once the cause is fixed. Nothing here can override it.
            </p>
          </div>
        </div>
      )}

      {orders && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Live orders" value={live.length} icon={<BanknotesIcon className="h-3.5 w-3.5" aria-hidden="true" />} hint={`of ${orders.length} tracked`} />
          <StatCard label="Committed" value={money(committed)} hint="wallet money currently posted" />
          <StatCard label="Outbid" value={outbid} tone={outbid ? 'accent' : 'default'} />
          <StatCard
            label="Steam session"
            value={session ? (accessLeft === 'expired' ? 'expired' : accessLeft ?? '—') : '—'}
            tone={accessLeft === 'expired' ? 'destructive' : 'success'}
            icon={<SteamMark className="h-3.5 w-3.5" />}
            hint={session ? (session.autoRenewOn ? `auto-renew on · refresh token ${refreshLeft ?? '—'}` : 'auto-renew not configured') : 'not reported yet'}
          />
        </div>
      )}

      <SessionPanel
        botKey={botKey}
        botLabel={ORDER_BOTS.find((b) => b.key === botKey)?.label ?? botKey}
        session={session}
        onApplied={load}
      />

      {updatedAt > 0 && (
        <p className="mt-2 text-xs text-muted-foreground/60">bot last synced {new Date(updatedAt).toLocaleTimeString()}</p>
      )}

      {!orders && !notConfigured && !error && <div className="mt-6"><Skeleton rows={6} /></div>}

      {orders && (
        <div className="mt-4">
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface/60">
                <tr>
                  <Th>Skin</Th>
                  <Th>Status</Th>
                  <Th right>Mine</Th>
                  <Th right>Top bid</Th>
                  <Th right>Lowest ask</Th>
                  <Th right>Ceiling</Th>
                  <Th right />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-hover/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <SkinThumb image={o.image} name={o.hashName} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{o.hashName}</p>
                          {o.lastError && <p className="truncate text-xs text-destructive/80" title={o.lastError}>{o.lastError}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><Pill tone={STATUS_TONE[o.status] ?? 'muted'}>{o.status}</Pill></td>
                    <td className="px-4 py-2.5 text-right font-medium tabular">{money(o.myCents)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular">{money(o.highestCents)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular">{money(o.lowestSellCents)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular">{money(o.maxCents)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {o.status === 'outbid' && o.highestCents != null && (
                        confirmId === o.id ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">place at {money(o.highestCents + 1)}?</span>
                            <button onClick={() => confirmRebid(o)} className="cursor-pointer rounded-md bg-success px-2 py-1 text-xs font-medium text-success-foreground hover:opacity-90">
                              Yes
                            </button>
                            <button onClick={() => setConfirmId(null)} className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmId(o.id)} className="mr-3 cursor-pointer text-success transition-opacity hover:opacity-80">
                            Re-bid
                          </button>
                        )
                      )}
                      {o.myCents != null && (
                        <button onClick={() => cancel(o)} className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive">
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!orders.length && (
              <Empty icon={<BanknotesIcon className="h-7 w-7 text-muted-foreground/40" aria-hidden="true" />}>
                No orders in this book yet.
              </Empty>
            )}
          </TableWrap>
        </div>
      )}
    </Page>
  );
}
