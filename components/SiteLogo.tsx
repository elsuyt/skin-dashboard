// Marketplace badges.
//
// These are deliberately monogram tiles in each site's own accent colour, not
// traced copies of their real logos — an approximated brand mark looks wrong at
// a glance and misrepresents someone else's identity. A consistent set of
// lettermarks reads cleaner in a dense table anyway.

interface SiteStyle {
  label: string;
  short: string;
  bg: string;
  fg: string;
}

const SITES: Record<string, SiteStyle> = {
  csfloat: { label: 'CSFloat', short: 'CF', bg: 'rgba(56,139,253,0.16)', fg: '#58a6ff' },
  dmarket: { label: 'DMarket', short: 'DM', bg: 'rgba(45,212,191,0.16)', fg: '#2dd4bf' },
  lisskins: { label: 'LIS-Skins', short: 'LS', bg: 'rgba(249,115,22,0.16)', fg: '#fb923c' },
  tradeit: { label: 'Tradeit.gg', short: 'TI', bg: 'rgba(52,211,153,0.16)', fg: '#34d399' },
  csmoney: { label: 'CS.MONEY', short: 'CM', bg: 'rgba(250,204,21,0.16)', fg: '#facc15' },
  steam: { label: 'Steam', short: 'ST', bg: 'rgba(139,148,255,0.16)', fg: '#a5b4fc' },
};

function styleFor(site: string): SiteStyle {
  return (
    SITES[site?.toLowerCase()] ?? {
      label: site || 'unknown',
      short: (site || '?').slice(0, 2).toUpperCase(),
      bg: 'rgba(139,151,172,0.14)',
      fg: 'var(--muted-foreground)',
    }
  );
}

export function SiteLogo({ site, withLabel = true }: { site: string; withLabel?: boolean }) {
  const s = styleFor(site);
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden="true"
        className="grid h-5 w-5 shrink-0 place-items-center rounded-[5px] text-[10px] font-bold tracking-tight"
        style={{ background: s.bg, color: s.fg }}
      >
        {s.short}
      </span>
      {withLabel ? <span className="text-muted-foreground">{s.label}</span> : <span className="sr-only">{s.label}</span>}
    </span>
  );
}

/** Steam's logo, for the places that specifically mean "the Steam market". */
export function SteamMark({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-9.96 9.23l5.34 2.2a2.83 2.83 0 0 1 1.6-.49h.14l2.37-3.44v-.05a3.77 3.77 0 1 1 3.77 3.77h-.09l-3.38 2.42v.12a2.84 2.84 0 0 1-5.62.5l-3.82-1.58A10 10 0 1 0 12 2Zm-3.2 15.16.99.41a2.13 2.13 0 1 0 1.2-3.9l1.06.44a1.57 1.57 0 1 1-1.2 2.9l-2.05-.85Zm10.02-6.63a2.51 2.51 0 1 0-5.02 0 2.51 2.51 0 0 0 5.02 0Zm-4.39 0a1.89 1.89 0 1 1 3.77 0 1.89 1.89 0 0 1-3.77 0Z" />
    </svg>
  );
}
