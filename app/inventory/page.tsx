'use client';
import { useEffect, useMemo, useState } from 'react';
import { ErrorBanner } from '@/components/StateBanner';
import { SkinThumb } from '@/components/SkinThumb';
import { SiteLogo, SteamMark } from '@/components/SiteLogo';
import {
  Page, PageHead, StatCard, TableWrap, Th, Empty, Skeleton, Pill, inputClass, btnGhost,
} from '@/components/ui';
import {
  ArrowPathIcon, FunnelIcon, XMarkIcon, ArrowTopRightOnSquareIcon,
  ArchiveBoxIcon, TagIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Row {
  assetId: string;
  name: string;
  float: number | null;
  stattrak: boolean;
  tradable: boolean;
  steamPrice: number | null;
  csfloatPrice: number | null;
  pctOfSteam: number | null;
  steamNet: number | null;
  csfloatNet: number | null;
  pctNet: number | null;
  image?: string | null;
}

const usd = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`);

// CSFloat above Steam is where you make money selling there; well below it is
// where Steam is the better venue. Text always accompanies the colour.
function pctTone(p: number | null) {
  if (p == null) return 'muted' as const;
  if (p >= 100) return 'success' as const;
  if (p >= 85) return 'warning' as const;
  return 'muted' as const;
}

function steamListUrl(name: string) {
  return `https://steamcommunity.com/market/listings/730/${encodeURIComponent(name)}`;
}
function csfloatSearchUrl(name: string) {
  return `https://csfloat.com/search?market_hash_name=${encodeURIComponent(name)}`;
}

export default function InventoryPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [missingSteam, setMissingSteam] = useState(0);
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [minValue, setMinValue] = useState('');
  const [onlyBetterOnCsfloat, setOnlyBetterOnCsfloat] = useState(false);
  const [net, setNet] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  async function load(force = false) {
    try {
      const res = await fetch(`/api/inventory${force ? '?refresh=1' : ''}`);
      const body = await res.json();
      if (!res.ok) {
        if (body.code === 'csfloat_not_configured') { setNotConfigured(true); setError(''); }
        else setError(body.error || `${res.status} ${res.statusText}`);
        return;
      }
      setRows(body.rows);
      setFetchedAt(body.fetchedAt);
      setMissingSteam(body.missingSteamPrice ?? 0);
      setNotConfigured(false);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      if (minValue) {
        const best = Math.max(r.csfloatPrice ?? 0, r.steamPrice ?? 0);
        if (best < Number(minValue)) return false;
      }
      const pct = net ? r.pctNet : r.pctOfSteam;
      if (onlyBetterOnCsfloat && !(pct != null && pct >= 100)) return false;
      return true;
    });
  }, [rows, q, minValue, onlyBetterOnCsfloat, net]);

  const stats = useMemo(() => {
    const csTotal = filtered.reduce((s, r) => s + ((net ? r.csfloatNet : r.csfloatPrice) ?? 0), 0);
    const stTotal = filtered.reduce((s, r) => s + ((net ? r.steamNet : r.steamPrice) ?? 0), 0);
    const better = filtered.filter((r) => {
      const p = net ? r.pctNet : r.pctOfSteam;
      return p != null && p >= 100;
    }).length;
    return { csTotal, stTotal, better, count: filtered.length };
  }, [filtered, net]);

  const pickedRows = filtered.filter((r) => picked.has(r.assetId));
  const pickedCs = pickedRows.reduce((s, r) => s + ((net ? r.csfloatNet : r.csfloatPrice) ?? 0), 0);
  const pickedSt = pickedRows.reduce((s, r) => s + ((net ? r.steamNet : r.steamPrice) ?? 0), 0);

  function toggle(id: string) {
    setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  const allShown = filtered.length > 0 && filtered.every((r) => picked.has(r.assetId));
  function toggleAll() {
    setPicked((p) => {
      const n = new Set(p);
      if (allShown) filtered.forEach((r) => n.delete(r.assetId));
      else filtered.forEach((r) => n.add(r.assetId));
      return n;
    });
  }

  return (
    <Page>
      <PageHead
        title="Inventory"
        count={rows?.length}
        subtitle="What you hold, with its float and what each market pays. Nothing here lists anything — pick what you want and open the market you choose."
        actions={
          <button
            onClick={async () => { setRefreshing(true); await load(true); setRefreshing(false); }}
            disabled={refreshing}
            className={btnGhost}
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh prices
          </button>
        }
      />

      {notConfigured && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3.5 text-sm">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-medium">CSFloat key not set on the server</p>
            <p className="mt-0.5 text-muted-foreground">
              Add <code className="rounded bg-surface px-1 py-0.5 text-xs">CSFLOAT_API_KEY</code> in Vercel →
              Settings → Environment Variables, then redeploy. It is the only way to read floats for items you own.
            </p>
          </div>
        </div>
      )}
      {error && <div className="mt-6"><ErrorBanner message={error} /></div>}

      {rows && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Items shown" value={stats.count} icon={<ArchiveBoxIcon className="h-3.5 w-3.5" aria-hidden="true" />} hint={`of ${rows.length} marketable`} />
          <StatCard label={net ? 'CSFloat pays you' : 'Value on CSFloat'} value={usd(stats.csTotal)} icon={<SiteLogo site="csfloat" withLabel={false} />} hint={net ? 'after CSFloat’s 2%' : undefined} />
          <StatCard label={net ? 'Steam pays you' : 'Value on Steam'} value={usd(stats.stTotal)} icon={<SteamMark className="h-3.5 w-3.5" />} hint={net ? 'after Steam’s ~15%' : 'before Steam’s ~15% cut'} />
          <StatCard label="Better on CSFloat" value={stats.better} tone={stats.better ? 'success' : 'default'} icon={<TagIcon className="h-3.5 w-3.5" aria-hidden="true" />} hint="at or above the Steam price" />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <FunnelIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="inv-q" className="sr-only">Search</label>
        <input id="inv-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search skins" className={`${inputClass} w-56`} />
        <label htmlFor="inv-min" className="sr-only">Minimum value</label>
        <input id="inv-min" value={minValue} onChange={(e) => setMinValue(e.target.value)} placeholder="min $ value" inputMode="decimal" className={`${inputClass} w-36 tabular`} />
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyBetterOnCsfloat} onChange={(e) => setOnlyBetterOnCsfloat(e.target.checked)} className="cursor-pointer accent-primary" />
          only where CSFloat pays more
        </label>
        <div className="ml-auto flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5" role="group" aria-label="Price basis">
          {([
            [true, 'After fees'],
            [false, 'Sticker price'],
          ] as const).map(([v, label]) => (
            <button
              key={label}
              onClick={() => setNet(v)}
              aria-pressed={net === v}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                net === v ? 'bg-surface-hover text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {(q || minValue || onlyBetterOnCsfloat) && (
          <button
            onClick={() => { setQ(''); setMinValue(''); setOnlyBetterOnCsfloat(false); }}
            className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" /> Clear
          </button>
        )}
      </div>

      {!rows && !notConfigured && !error && <div className="mt-6"><Skeleton /></div>}

      {rows && (
        <div className="mt-4">
          <TableWrap maxHeight="66vh">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface/60">
                <tr>
                  <Th>
                    <input
                      type="checkbox"
                      checked={allShown}
                      onChange={toggleAll}
                      aria-label="Select all shown"
                      className="cursor-pointer accent-primary"
                    />
                  </Th>
                  <Th>Skin</Th>
                  <Th right>Float</Th>
                  <Th right>{net ? 'Steam pays you' : 'Steam price'}</Th>
                  <Th right>{net ? 'CSFloat pays you' : 'CSFloat price'}</Th>
                  <Th right>CSFloat % of Steam</Th>
                  <Th right>Open</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.assetId} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-hover/50">
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={picked.has(r.assetId)}
                        onChange={() => toggle(r.assetId)}
                        aria-label={`Select ${r.name}`}
                        className="cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <SkinThumb image={r.image} name={r.name} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">{r.name}</span>
                            {r.stattrak && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">ST</span>}
                          </div>
                          {!r.tradable && <p className="text-xs text-warning">not tradable</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">{r.float != null ? r.float.toFixed(6) : '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">
                      {usd(net ? r.steamNet : r.steamPrice)}
                      {r.steamPrice != null && (
                        <span className="ml-1.5 text-xs text-muted-foreground/50">
                          {net ? `of ${usd(r.steamPrice)}` : `→ ${usd(r.steamNet)}`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular">
                      {usd(net ? r.csfloatNet : r.csfloatPrice)}
                      {r.csfloatPrice != null && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground/50">
                          {net ? `of ${usd(r.csfloatPrice)}` : `→ ${usd(r.csfloatNet)}`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {(net ? r.pctNet : r.pctOfSteam) != null
                        ? <Pill tone={pctTone(net ? r.pctNet : r.pctOfSteam)}>{net ? r.pctNet : r.pctOfSteam}%</Pill>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <a href={csfloatSearchUrl(r.name)} target="_blank" rel="noreferrer" className="mr-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                        CSFloat <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
                      </a>
                      <a href={steamListUrl(r.name)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                        Steam <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <Empty icon={<ArchiveBoxIcon className="h-7 w-7 text-muted-foreground/40" aria-hidden="true" />}>
                Nothing matches these filters.
              </Empty>
            )}
          </TableWrap>
        </div>
      )}

      {pickedRows.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface/50 px-4 py-4">
          <div>
            <p className="text-sm font-medium">{pickedRows.length} selected</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              CSFloat <span className="tabular text-foreground">{usd(pickedCs)}</span> ·
              Steam <span className="tabular text-foreground">{usd(pickedSt)}</span>
              {pickedSt > 0 && (
                <> · CSFloat pays <span className="tabular text-foreground">{Math.round((pickedCs / pickedSt) * 100)}%</span> of Steam</>
              )}
            </p>
          </div>
          <button onClick={() => setPicked(new Set())} className={btnGhost}>Clear selection</button>
        </div>
      )}

      {rows && (
        <p className="mt-3 text-xs text-muted-foreground/60">
          Floats from CSFloat · prices from the csgotrader mirror, refreshed {fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : '—'}.
          Steam figures are the last-24h average, not a live quote · “after fees” takes Steam’s ~15% seller cut and CSFloat’s 2%
          {missingSteam > 0 && <> · {missingSteam} item{missingSteam === 1 ? '' : 's'} have no Steam price in the mirror</>}.
        </p>
      )}
    </Page>
  );
}
