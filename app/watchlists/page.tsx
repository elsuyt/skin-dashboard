'use client';
import { useEffect, useState } from 'react';
import { BOTS } from '@/lib/bots';
import { api, NotConfiguredError } from '@/lib/api-client';
import { csmoneyLink, tradeitLink } from '@/lib/links';
import { SetupBanner, ErrorBanner } from '@/components/StateBanner';
import { SkinThumb } from '@/components/SkinThumb';
import { SiteLogo } from '@/components/SiteLogo';
import { SkinPicker } from '@/components/SkinPicker';
import { ActivityFeed } from '@/components/ActivityFeed';
import { OpenAllLinks } from '@/components/OpenAllLinks';
import {
  Page, PageHead, TableWrap, Th, Empty, Skeleton, Card, inputClass, btnPrimary,
} from '@/components/ui';
import type { WatchItem, WatchMatch, BotEvent } from '@/lib/types';
import { PlusIcon, TrashIcon, ArrowTopRightOnSquareIcon, ListBulletIcon } from '@heroicons/react/24/outline';

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
  const [events, setEvents] = useState<BotEvent[]>([]);

  async function load() {
    try {
      const state = await api.getWatchlist(botKey);
      setWatches(state.watches);
      setMatches(new Map(state.matches.map((m) => [m.watchId, m])));
      setUpdatedAt(state.updatedAt);
      setEvents(state.events ?? []);
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

  // Built from the FILTERED rows, not the whole list — narrow with the filters
  // first, then open, rather than launching 60-odd tabs every time.
  const csmoneyUrls = filtered.map(csmoneyLink);
  const tradeitUrls = filtered.map(tradeitLink);

  return (
    <Page>
      <PageHead
        title="Watchlists"
        count={watches?.length}
        subtitle="Edits are queued and applied by the bot on its own next cycle — nothing here takes effect instantly, by design."
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

      <Card className="mt-5">
        <form onSubmit={submitAdd} className="p-5">
          <p className="text-sm font-medium">Add a skin to watch</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_repeat(2,minmax(0,0.7fr))_auto]">
            <div>
              <label htmlFor="watch-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">Skin</label>
              <SkinPicker id="watch-name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            </div>
            <div>
              <label htmlFor="watch-ext" className="mb-1.5 block text-xs font-medium text-muted-foreground">Exterior</label>
              <select
                id="watch-ext"
                value={form.exterior}
                onChange={(e) => setForm({ ...form, exterior: e.target.value })}
                className={`${inputClass} w-full cursor-pointer`}
              >
                {EXTERIORS.map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="watch-float" className="mb-1.5 block text-xs font-medium text-muted-foreground">Max float</label>
              <input id="watch-float" value={form.maxFloat} onChange={(e) => setForm({ ...form, maxFloat: e.target.value })} placeholder="any" inputMode="decimal" className={`${inputClass} w-full tabular`} />
            </div>
            <div>
              <label htmlFor="watch-price" className="mb-1.5 block text-xs font-medium text-muted-foreground">Max price $</label>
              <input id="watch-price" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} placeholder="0.00" inputMode="decimal" className={`${inputClass} w-full tabular`} />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex cursor-pointer select-none items-center gap-2 pb-2 text-sm">
                <input type="checkbox" checked={form.stattrak} onChange={(e) => setForm({ ...form, stattrak: e.target.checked })} className="cursor-pointer accent-primary" />
                StatTrak
              </label>
              <button type="submit" disabled={busy || !form.name.trim() || !form.maxPrice} className={btnPrimary}>
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Add
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground/70">
            Watches every market by default. The bot picks it up on its next sync, within ~30s.
          </p>
        </form>
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Open on the marketplaces</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Opens the {filtered.length} skin{filtered.length === 1 ? '' : 's'} shown below, in batches of 6 a few seconds apart so the
            sites don&apos;t throttle you. Narrow with the filters first if that&apos;s too many.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <OpenAllLinks label="CS.MONEY" links={csmoneyUrls} />
          <OpenAllLinks label="Tradeit" links={tradeitUrls} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <input value={floatFilter} onChange={(e) => setFloatFilter(e.target.value)} placeholder="filter: max float" inputMode="decimal" className={`${inputClass} w-40 tabular`} />
        <input value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} placeholder="filter: max price" inputMode="decimal" className={`${inputClass} w-40 tabular`} />
        {updatedAt > 0 && (
          <span className="text-xs text-muted-foreground/60">bot last synced {new Date(updatedAt).toLocaleTimeString()}</span>
        )}
      </div>

      {!watches && !notConfigured && !error && <div className="mt-4"><Skeleton /></div>}

      {watches && (
        <div className="mt-4">
          <TableWrap maxHeight="65vh">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface/60">
                <tr>
                  <Th>Skin</Th>
                  <Th right>Ceiling</Th>
                  <Th right>Float cap</Th>
                  <Th>Current match</Th>
                  <Th>Compare</Th>
                  <Th right />
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => {
                  const m = matches.get(w.id);
                  return (
                    <tr key={w.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-hover/50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <SkinThumb image={w.image} name={w.name} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium">{w.name}</span>
                              {w.stattrak && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">ST</span>}
                              {!w.enabled && <span className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">off</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">{w.exterior}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular">${w.maxPrice.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground tabular">{w.maxFloat ?? 'any'}</td>
                      <td className="px-4 py-2.5">
                        {m ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium tabular">${m.price.toFixed(2)}</span>
                            <SiteLogo site={m.site} withLabel={false} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <a href={csmoneyLink(w)} target="_blank" rel="noreferrer" title="Open on CS.MONEY with this watch's filters" className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                            CS.MONEY <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
                          </a>
                          <a href={tradeitLink(w)} target="_blank" rel="noreferrer" title="Search this skin on Tradeit.gg (name search only)" className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                            Tradeit <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => remove(w.id)} className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-muted-foreground transition-colors hover:text-destructive">
                          <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filtered.length && (
              <Empty icon={<ListBulletIcon className="h-7 w-7 text-muted-foreground/40" aria-hidden="true" />}>
                No watches match these filters.
              </Empty>
            )}
          </TableWrap>
        </div>
      )}

      {watches && (
        <div className="mt-8">
          <h2 className="text-sm font-medium">Recent activity on this bot</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">What it actually did — no need to check Telegram.</p>
          <Card className="mt-3">
            <ActivityFeed events={events} limit={8} emptyText="Nothing yet on this bot." />
          </Card>
        </div>
      )}
    </Page>
  );
}
