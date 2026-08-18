'use client';
import { useEffect, useState } from 'react';
import { BOTS } from '@/lib/bots';
import { api, NotConfiguredError } from '@/lib/api-client';
import { csmoneyLink, tradeitLink } from '@/lib/links';
import { SetupBanner, ErrorBanner } from '@/components/StateBanner';
import type { WatchItem, WatchMatch } from '@/lib/types';
import { PlusIcon, TrashIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

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
  const [notConfigured, setNotConfigured] = useState(false);
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
      setNotConfigured(false);
      setError('');
    } catch (e) {
      if (e instanceof NotConfiguredError) setNotConfigured(true);
      else setError(e instanceof Error ? e.message : String(e));
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
      <h1 className="text-xl font-semibold tracking-tight">Watchlists</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Changes here are queued and applied by the bot on its own next cycle — nothing happens instantly, by design.
      </p>

      <div className="mt-5 flex gap-2">
        {WATCHLIST_BOTS.map((b) => (
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

      <form onSubmit={submitAdd} className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface/60 p-4 sm:grid-cols-6">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="AK-47 | Redline"
          className="col-span-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <select
          value={form.exterior}
          onChange={(e) => setForm({ ...form, exterior: e.target.value })}
          className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        >
          {EXTERIORS.map((x) => <option key={x}>{x}</option>)}
        </select>
        <input
          value={form.maxFloat}
          onChange={(e) => setForm({ ...form, maxFloat: e.target.value })}
          placeholder="max float"
          inputMode="decimal"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <input
          value={form.maxPrice}
          onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}
          placeholder="max price $"
          inputMode="decimal"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground">
          <input type="checkbox" checked={form.stattrak} onChange={(e) => setForm({ ...form, stattrak: e.target.checked })} className="cursor-pointer accent-primary" />
          StatTrak
        </label>
        <button
          type="submit"
          disabled={busy}
          className="col-span-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 sm:col-span-6"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          Add watch
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={floatFilter}
          onChange={(e) => setFloatFilter(e.target.value)}
          placeholder="filter: max float"
          inputMode="decimal"
          className="w-36 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <input
          value={priceFilter}
          onChange={(e) => setPriceFilter(e.target.value)}
          placeholder="filter: max price"
          inputMode="decimal"
          className="w-36 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring"
        />
        {updatedAt > 0 && (
          <span className="text-xs text-muted-foreground/70">bot last synced {new Date(updatedAt).toLocaleTimeString()}</span>
        )}
      </div>

      {!watches && !notConfigured && !error && (
        <div className="mt-4 space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface" />)}
        </div>
      )}

      {watches && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Skin</th>
                <th className="px-3 py-2 font-medium">Ceiling</th>
                <th className="px-3 py-2 font-medium">Float cap</th>
                <th className="px-3 py-2 font-medium">Current match</th>
                <th className="px-3 py-2 font-medium">Links</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const m = matches.get(w.id);
                return (
                  <tr key={w.id} className="border-t border-border transition-colors hover:bg-surface/60">
                    <td className="px-3 py-2">
                      {w.name} <span className="text-muted-foreground">({w.exterior})</span>
                      {w.stattrak && <span className="ml-1.5 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">ST</span>}
                    </td>
                    <td className="px-3 py-2 font-mono">${w.maxPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{w.maxFloat ?? 'any'}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {m ? `$${m.price.toFixed(2)} on ${m.site}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <a
                          href={csmoneyLink(w)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
                          title="Search on CS.MONEY (not live-filterable, name search only)"
                        >
                          CS.MONEY <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
                        </a>
                        <a
                          href={tradeitLink(w)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
                          title="Search on Tradeit.gg (name search only)"
                        >
                          Tradeit <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => remove(w.id)}
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
          {!filtered.length && <p className="px-3 py-10 text-center text-sm text-muted-foreground">No watches match these filters.</p>}
        </div>
      )}
    </div>
  );
}
