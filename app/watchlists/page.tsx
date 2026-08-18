'use client';
import { useEffect, useState } from 'react';
import { BOTS } from '@/lib/bots';
import { api } from '@/lib/api-client';
import type { WatchItem, WatchMatch } from '@/lib/types';

const WATCHLIST_BOTS = BOTS.filter((b) => b.kind === 'watchlist');
const EXTERIORS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
const ALL_SITES = ['csfloat', 'dmarket', 'lisskins', 'tradeit'];

function emptyForm() {
  return { name: '', exterior: 'Field-Tested', stattrak: false, maxFloat: '', maxPrice: '', sites: [...ALL_SITES] };
}

export default function WatchlistsPage() {
  const [botKey, setBotKey] = useState(WATCHLIST_BOTS[0].key);
  const [watches, setWatches] = useState<WatchItem[] | null>(null);
  const [matches, setMatches] = useState<Map<string, WatchMatch>>(new Map());
  const [updatedAt, setUpdatedAt] = useState(0);
  const [error, setError] = useState('');
  const [floatFilter, setFloatFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const state = await api.getWatchlist(botKey);
      setWatches(state.watches);
      setMatches(new Map(state.matches.map((m) => [m.watchId, m])));
      setUpdatedAt(state.updatedAt);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    setWatches(null);
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botKey]);

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.maxPrice) return;
    setBusy(true);
    try {
      await api.addWatch(botKey, {
        name: form.name.trim(),
        exterior: form.exterior,
        stattrak: form.stattrak,
        maxFloat: form.maxFloat ? Number(form.maxFloat) : null,
        maxPrice: Number(form.maxPrice),
        sites: form.sites,
        enabled: true,
      });
      setForm(emptyForm());
      // Queued, not applied yet — the bot picks it up on its next sync tick.
      setTimeout(load, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this watch? The bot will stop checking it on its next sync.')) return;
    await api.removeWatch(botKey, id);
    setTimeout(load, 3000);
  }

  const filtered = (watches ?? []).filter((w) => {
    if (floatFilter && w.maxFloat != null && w.maxFloat > Number(floatFilter)) return false;
    if (priceFilter && w.maxPrice > Number(priceFilter)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold">Watchlists</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Changes here are queued and applied by the bot on its own next cycle — nothing happens instantly, by design.
      </p>

      <div className="mt-5 flex gap-2">
        {WATCHLIST_BOTS.map((b) => (
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

      <form onSubmit={submitAdd} className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 sm:grid-cols-6">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="AK-47 | Redline"
          className="col-span-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm placeholder:text-neutral-600"
        />
        <select
          value={form.exterior}
          onChange={(e) => setForm({ ...form, exterior: e.target.value })}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
        >
          {EXTERIORS.map((x) => <option key={x}>{x}</option>)}
        </select>
        <input
          value={form.maxFloat}
          onChange={(e) => setForm({ ...form, maxFloat: e.target.value })}
          placeholder="max float"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm placeholder:text-neutral-600"
        />
        <input
          value={form.maxPrice}
          onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}
          placeholder="max price $"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm placeholder:text-neutral-600"
        />
        <label className="flex items-center gap-1.5 text-sm text-neutral-300">
          <input type="checkbox" checked={form.stattrak} onChange={(e) => setForm({ ...form, stattrak: e.target.checked })} />
          StatTrak
        </label>
        <button
          type="submit"
          disabled={busy}
          className="col-span-2 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50 sm:col-span-6"
        >
          Add watch
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <input
          value={floatFilter}
          onChange={(e) => setFloatFilter(e.target.value)}
          placeholder="filter: max float"
          className="w-36 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm placeholder:text-neutral-600"
        />
        <input
          value={priceFilter}
          onChange={(e) => setPriceFilter(e.target.value)}
          placeholder="filter: max price"
          className="w-36 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm placeholder:text-neutral-600"
        />
        {updatedAt > 0 && (
          <span className="text-xs text-neutral-600">bot last synced {new Date(updatedAt).toLocaleTimeString()}</span>
        )}
      </div>

      {!watches && !error && <p className="mt-8 text-sm text-neutral-500">Loading…</p>}

      {watches && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left text-neutral-400">
              <tr>
                <th className="px-3 py-2 font-medium">Skin</th>
                <th className="px-3 py-2 font-medium">Ceiling</th>
                <th className="px-3 py-2 font-medium">Float cap</th>
                <th className="px-3 py-2 font-medium">Current match</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const m = matches.get(w.id);
                return (
                  <tr key={w.id} className="border-t border-neutral-800 hover:bg-neutral-900/50">
                    <td className="px-3 py-2">
                      {w.name} <span className="text-neutral-500">({w.exterior})</span>
                      {w.stattrak && <span className="ml-1 rounded bg-amber-950 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">ST</span>}
                    </td>
                    <td className="px-3 py-2 font-mono">${w.maxPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-neutral-400">{w.maxFloat ?? 'any'}</td>
                    <td className="px-3 py-2 font-mono text-neutral-400">
                      {m ? `$${m.price.toFixed(2)} on ${m.site}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => remove(w.id)} className="text-neutral-500 hover:text-red-400">
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && <p className="px-3 py-8 text-center text-sm text-neutral-500">No watches match these filters.</p>}
        </div>
      )}
    </div>
  );
}
