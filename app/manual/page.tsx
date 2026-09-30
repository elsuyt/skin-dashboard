'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { csmoneyLink, tradeitLink, dmarketLink, lisskinsLink, steamLink } from '@/lib/links';
import { ErrorBanner } from '@/components/StateBanner';
import { SkinThumb } from '@/components/SkinThumb';
import { SkinPicker } from '@/components/SkinPicker';
import { OpenAllLinks } from '@/components/OpenAllLinks';
import {
  Page, PageHead, TableWrap, Th, Empty, Skeleton, Card, inputClass, btnPrimary,
} from '@/components/ui';
import type { ManualWatch } from '@/lib/types';
import { PlusIcon, TrashIcon, ArrowTopRightOnSquareIcon, ListBulletIcon } from '@heroicons/react/24/outline';

// Skins you're tracking by hand — never a bot's watchlist, never auto-buy.
// See lib/manual-store.ts for the structural guarantee (its own Redis key,
// no bot ever reads or writes it). This used to be a third tab bolted onto
// /watchlists; split out to its own page and nav entry on 2026-09-30 because
// a tab next to two bot tabs, behind a label reading "no bot", was too easy
// to lose track of — exactly what happened.
const EXTERIORS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];

function emptyForm() {
  return { name: '', exterior: 'Field-Tested', stattrak: false, maxFloat: '', maxPrice: '' };
}

export default function ManualPage() {
  const [watches, setWatches] = useState<ManualWatch[] | null>(null);
  const [error, setError] = useState('');
  const [floatFilter, setFloatFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const state = await api.getManualWatches();
      setWatches(state.watches);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // No bot lag to poll for here — an add/remove is visible on the very next
  // GET, and nothing external ever changes this list, so there is nothing to
  // poll for in the background either.
  useEffect(() => { load(); }, []);

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.maxPrice) return;
    setBusy(true);
    try {
      await api.addManualWatch({
        name: form.name.trim(),
        exterior: form.exterior,
        stattrak: form.stattrak,
        maxFloat: form.maxFloat ? Number(form.maxFloat) : null,
        maxPrice: Number(form.maxPrice),
      });
      setForm(emptyForm());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this skin from your manual list?')) return;
    await api.removeManualWatch(id);
    load();
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
  const dmarketUrls = filtered.map(dmarketLink);
  const lisskinsUrls = filtered.map(lisskinsLink);
  const steamUrls = filtered.map(steamLink);

  return (
    <Page>
      <PageHead
        title="Manual checking"
        count={watches?.length}
        subtitle='Your own list — nothing here is watched by a bot or fed to auto-buy. It only builds the "open on the marketplace" links below, with your own float/price ceilings already filled in.'
      />

      {error && <div className="mt-6"><ErrorBanner message={error} /></div>}

      <Card className="mt-5">
        <form onSubmit={submitAdd} className="p-5">
          <p className="text-sm font-medium">Add a skin</p>
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
            Not watched by anything — this only builds the marketplace links below with these ceilings. Added instantly.
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
          <OpenAllLinks label="DMarket" links={dmarketUrls} />
          <OpenAllLinks
            label="LIS-Skins"
            links={lisskinsUrls}
            batchSize={1}
            gapMs={10000}
            note="Still rate-limited even at this pace? Use Copy and open a handful yourself with pauses — its Cloudflare limit is stricter than this button can guarantee."
          />
          <OpenAllLinks label="Steam" links={steamUrls} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <input value={floatFilter} onChange={(e) => setFloatFilter(e.target.value)} placeholder="filter: max float" inputMode="decimal" className={`${inputClass} w-44 tabular`} />
        <input value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} placeholder="filter: max price" inputMode="decimal" className={`${inputClass} w-40 tabular`} />
      </div>

      {!watches && !error && <div className="mt-4"><Skeleton /></div>}

      {watches && (
        <div className="mt-4">
          <TableWrap maxHeight="65vh">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface/60">
                <tr>
                  <Th>Skin</Th>
                  <Th right>Ceiling</Th>
                  <Th right>Float cap</Th>
                  <Th>Open on</Th>
                  <Th right />
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-hover/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <SkinThumb image={w.image} name={w.name} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">{w.name}</span>
                            {w.stattrak && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">ST</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{w.exterior}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular">${w.maxPrice.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular">{w.maxFloat ?? 'any'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <a href={csmoneyLink(w)} target="_blank" rel="noreferrer" title="Open on CS.MONEY with this watch's filters" className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                          CS.MONEY <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
                        </a>
                        <a href={tradeitLink(w)} target="_blank" rel="noreferrer" title="Search this skin on Tradeit.gg (name search only)" className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                          Tradeit <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
                        </a>
                        <a href={dmarketLink(w)} target="_blank" rel="noreferrer" title="Open on DMarket with this watch's name, exterior and max price (no float filter — DMarket drops it from the URL)" className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                          DMarket <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
                        </a>
                        <a href={lisskinsLink(w)} target="_blank" rel="noreferrer" title="Open this skin's LIS-Skins page (the slug is the only filter it accepts)" className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                          LIS-Skins <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
                        </a>
                        <a href={steamLink(w)} target="_blank" rel="noreferrer" title="Open this skin on the Steam Community Market (Steam's new grouped UI may land on the skin rather than this exact wear)" className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                          Steam <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
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
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <Empty icon={<ListBulletIcon className="h-7 w-7 text-muted-foreground/40" aria-hidden="true" />}>
                No skins match these filters.
              </Empty>
            )}
          </TableWrap>
        </div>
      )}
    </Page>
  );
}
