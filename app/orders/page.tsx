'use client';
import { useEffect, useState } from 'react';
import { BOTS } from '@/lib/bots';
import { api } from '@/lib/api-client';
import type { OrderItem } from '@/lib/types';

const ORDER_BOTS = BOTS.filter((b) => b.kind === 'orders');

function money(cents: number | null) {
  return cents == null ? '—' : `$${(cents / 100).toFixed(2)}`;
}

const STATUS_STYLE: Record<string, string> = {
  top: 'text-emerald-400',
  outbid: 'text-amber-400',
  ceiling: 'text-red-400',
  pending: 'text-neutral-500',
  error: 'text-red-400',
};

export default function OrdersPage() {
  const [botKey, setBotKey] = useState(ORDER_BOTS[0].key);
  const [orders, setOrders] = useState<OrderItem[] | null>(null);
  const [accountBlocked, setAccountBlocked] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    try {
      const state = await api.getOrders(botKey);
      setOrders(state.orders);
      setAccountBlocked(state.accountBlocked);
      setUpdatedAt(state.updatedAt);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold">Buy orders</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Real Steam wallet money. Placing/cancelling here queues the exact same action your Telegram buttons trigger — same
        guards, same two-step confirm, just from here instead.
      </p>

      <div className="mt-5 flex gap-2">
        {ORDER_BOTS.map((b) => (
          <button
            key={b.key}
            onClick={() => setBotKey(b.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              botKey === b.key ? 'bg-neutral-100 text-neutral-900' : 'border border-neutral-700 text-neutral-300 hover:bg-neutral-900'
            }`}
          >
            {b.label} <span className="opacity-60">({b.account})</span>
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {accountBlocked && (
        <div className="mt-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          🛑 <b>Account-level problem, auto-rebid/refill paused:</b> {accountBlocked}
          <br />
          <span className="text-red-400/80">This clears on the bot&apos;s own restart once you&apos;ve fixed the cause — nothing here can override it.</span>
        </div>
      )}

      {updatedAt > 0 && (
        <p className="mt-4 text-xs text-neutral-600">bot last synced {new Date(updatedAt).toLocaleTimeString()}</p>
      )}

      {!orders && !error && <p className="mt-8 text-sm text-neutral-500">Loading…</p>}

      {orders && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left text-neutral-400">
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
                <tr key={o.id} className="border-t border-neutral-800 hover:bg-neutral-900/50">
                  <td className="px-3 py-2">{o.hashName}</td>
                  <td className={`px-3 py-2 font-medium ${STATUS_STYLE[o.status] ?? ''}`}>{o.status}</td>
                  <td className="px-3 py-2 font-mono">{money(o.myCents)}</td>
                  <td className="px-3 py-2 font-mono text-neutral-400">{money(o.highestCents)}</td>
                  <td className="px-3 py-2 font-mono text-neutral-400">{money(o.lowestSellCents)}</td>
                  <td className="px-3 py-2 font-mono text-neutral-400">{money(o.maxCents)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {o.status === 'outbid' && o.highestCents != null && (
                      confirmId === o.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-neutral-400">place at {money(o.highestCents + 1)}?</span>
                          <button onClick={() => confirmRebid(o)} className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500">
                            Yes
                          </button>
                          <button onClick={() => setConfirmId(null)} className="text-neutral-500 hover:text-neutral-200">
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmId(o.id)} className="mr-3 text-emerald-400 hover:text-emerald-300">
                          Re-bid
                        </button>
                      )
                    )}
                    {o.myCents != null && (
                      <button onClick={() => cancel(o)} className="text-neutral-500 hover:text-red-400">
                        Cancel order
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && <p className="px-3 py-8 text-center text-sm text-neutral-500">No orders in this book yet.</p>}
        </div>
      )}
    </div>
  );
}
