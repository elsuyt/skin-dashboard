import type { WatchlistState, OrdersState, WatchItem } from './types';

async function jsonFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getWatchlist: (bot: string) => jsonFetch<WatchlistState>(`/api/watches?bot=${encodeURIComponent(bot)}`),
  addWatch: (bot: string, watch: Omit<WatchItem, 'id'> & { id?: string }) =>
    jsonFetch(`/api/watches`, { method: 'POST', body: JSON.stringify({ bot, watch }) }),
  removeWatch: (bot: string, id: string) =>
    jsonFetch(`/api/watches?bot=${encodeURIComponent(bot)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateWatch: (bot: string, id: string, patch: { maxFloat?: number | null; maxPrice?: number; enabled?: boolean }) =>
    jsonFetch(`/api/watches`, { method: 'PATCH', body: JSON.stringify({ bot, id, ...patch }) }),

  getOrders: (bot: string) => jsonFetch<OrdersState>(`/api/orders?bot=${encodeURIComponent(bot)}`),
  placeOrder: (bot: string, orderId: string, targetCents: number, raiseCeiling?: boolean) =>
    jsonFetch(`/api/orders/place`, { method: 'POST', body: JSON.stringify({ bot, orderId, targetCents, raiseCeiling }) }),
  cancelOrder: (bot: string, orderId: string) =>
    jsonFetch(`/api/orders/cancel`, { method: 'POST', body: JSON.stringify({ bot, orderId }) }),
};
