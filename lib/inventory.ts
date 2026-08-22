import 'server-only';
import { skinImage } from './skin-images';

// Your CS2 inventory, priced for deciding what to sell and where.
//
// Three sources, all server-side:
//   1. CSFloat /me/inventory — the only practical way to get FLOATS for items
//      you own. Steam's inventory API returns an inspect link containing the
//      literal `%propid:6%` placeholder, which only the Steam client can
//      expand, so no external float service can resolve it.
//   2. prices.csgotrader.app/latest/steam.json   — Steam market price
//   3. prices.csgotrader.app/latest/csfloat.json — CSFloat market price
//
// The two price files are ~3.7MB and ~2.7MB. They are fetched whole, reduced
// immediately to just the names you actually hold, and the small result is
// cached — so the big payloads never sit in memory and Next's 2MB fetch-cache
// limit is never involved.
//
// Prices are USD in both mirrors, so the percentage is a like-for-like ratio.
//
// Both markets take a cut from the SELLER, and they are very different sizes.
// Comparing the two sticker prices makes Steam look better than it pays: on a
// $12.10 Steam listing you receive $10.52, and on a $19.39 CSFloat listing you
// receive $19.00. So the net figures are computed here and shown alongside.

const CSFLOAT_INVENTORY = 'https://csfloat.com/api/v1/me/inventory';
const STEAM_PRICES = 'https://prices.csgotrader.app/latest/steam.json';
const CSFLOAT_PRICES = 'https://prices.csgotrader.app/latest/csfloat.json';

const CACHE_MS = 15 * 60 * 1000;

// Steam's listed price is what the BUYER pays; 10% Steam + 5% game fee comes
// off the top, so the seller receives price / 1.15.
const STEAM_FEE_DIVISOR = 1.15;
// CSFloat charges the seller 2%.
const CSFLOAT_FEE_RATE = 0.02;

export interface InventoryRow {
  assetId: string;
  name: string;
  float: number | null;
  stattrak: boolean;
  tradable: boolean;
  steamPrice: number | null;   // USD
  csfloatPrice: number | null; // USD
  pctOfSteam: number | null;   // csfloat as a % of steam, sticker vs sticker
  steamNet: number | null;     // what you actually receive after Steam's cut
  csfloatNet: number | null;   // what you actually receive after CSFloat's cut
  pctNet: number | null;       // csfloat net as a % of steam net — the real one
  image: string | null;
}

export interface InventoryResult {
  rows: InventoryRow[];
  fetchedAt: number;
  steamPriceAgeNote: string;
  missingSteamPrice: number;
}

let cache: { at: number; data: InventoryResult } | null = null;

export class CsfloatNotConfiguredError extends Error {
  constructor() {
    super('CSFLOAT_API_KEY is not set. Add it in Vercel (Settings → Environment Variables) and redeploy.');
    this.name = 'CsfloatNotConfiguredError';
  }
}

async function getJson(url: string, headers?: Record<string, string>) {
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error(`${url.replace(/^https:\/\//, '')} → HTTP ${res.status}`);
  return res.json();
}

// The mirrors quote several windows for Steam; last_24h is the closest thing to
// "what it sells for now". Fall back through the longer windows so a thinly
// traded skin still gets a number rather than a dash.
function steamPriceOf(entry: unknown): number | null {
  if (entry == null) return null;
  if (typeof entry === 'number') return entry;
  const e = entry as Record<string, unknown>;
  for (const k of ['last_24h', 'last_7d', 'last_30d', 'last_90d']) {
    const v = e[k];
    if (typeof v === 'number' && v > 0) return v;
  }
  return null;
}

function csfloatPriceOf(entry: unknown): number | null {
  if (entry == null) return null;
  if (typeof entry === 'number') return entry;
  const p = (entry as Record<string, unknown>).price;
  return typeof p === 'number' && p > 0 ? p : null;
}

export async function getInventory(force = false): Promise<InventoryResult> {
  const key = process.env.CSFLOAT_API_KEY;
  if (!key) throw new CsfloatNotConfiguredError();

  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  const raw = await getJson(CSFLOAT_INVENTORY, { Authorization: key });
  const items = (Array.isArray(raw) ? raw : (raw.items ?? [])) as Array<Record<string, unknown>>;

  // Only these names are ever looked up, so the multi-megabyte price files can
  // be discarded straight after the join.
  const wanted = new Set(items.map((i) => String(i.market_hash_name ?? '')));

  const [steamAll, csAll] = await Promise.all([getJson(STEAM_PRICES), getJson(CSFLOAT_PRICES)]);
  const steam = new Map<string, number | null>();
  const cs = new Map<string, number | null>();
  for (const n of wanted) {
    steam.set(n, steamPriceOf((steamAll as Record<string, unknown>)[n]));
    cs.set(n, csfloatPriceOf((csAll as Record<string, unknown>)[n]));
  }

  const rows: InventoryRow[] = items.map((i) => {
    const name = String(i.market_hash_name ?? '');
    const sp = steam.get(name) ?? null;
    const cp = cs.get(name) ?? null;
    const sn = sp ? sp / STEAM_FEE_DIVISOR : null;
    const cn = cp ? cp * (1 - CSFLOAT_FEE_RATE) : null;
    return {
      assetId: String(i.asset_id ?? ''),
      name,
      float: typeof i.float_value === 'number' ? i.float_value : null,
      stattrak: !!i.is_stattrak,
      tradable: !!i.tradable,
      steamPrice: sp,
      csfloatPrice: cp,
      pctOfSteam: sp && cp ? Math.round((cp / sp) * 100) : null,
      steamNet: sn,
      csfloatNet: cn,
      pctNet: sn && cn ? Math.round((cn / sn) * 100) : null,
      image: skinImage(name),
    };
  });

  // Cheapest-looking deals first is the wrong default here — you are selling,
  // so lead with the most valuable thing you hold.
  rows.sort((a, b) => (b.csfloatPrice ?? b.steamPrice ?? 0) - (a.csfloatPrice ?? a.steamPrice ?? 0));

  const data: InventoryResult = {
    rows,
    fetchedAt: Date.now(),
    steamPriceAgeNote: 'Steam prices are the mirror’s last-24h figure, not a live quote.',
    missingSteamPrice: rows.filter((r) => r.steamPrice == null).length,
  };
  cache = { at: Date.now(), data };
  return data;
}
