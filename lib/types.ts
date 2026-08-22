// Shared shape between the dashboard and every bot-side sync script.
// Keep this file's field names in sync with dashboard-sync.cjs's payloads —
// there is deliberately no code generation here, just discipline.

export interface WatchItem {
  id: string;
  enabled: boolean;
  name: string;
  exterior: string;
  stattrak: boolean;
  maxFloat: number | null;
  maxPrice: number;
  sites: string[];
  // Added by the API layer from the local artwork snapshot, never by the bots.
  image?: string | null;
}

// One current best-known listing for a watch, as of the bot's last sweep.
// Absent (undefined) fields mean the bot hasn't matched that watch recently.
export interface WatchMatch {
  watchId: string;
  // Unique per listing ("<site>:<listingId>"). A watch can have several
  // matches — the cheapest is not always the best float.
  matchId: string;
  site: string;
  price: number;
  float: number | null;
  steamPrice: number | null;
  thirdLowPrice: number | null;
  url: string | null;
  seenAt: number; // epoch ms
  // True when this market HAS a purchase path at all (csfloat/dmarket/lisskins
  // yes, tradeit no). It says nothing about whether this particular listing can
  // still be staged — see `stageable`.
  cartable?: boolean;
  // True when Add would actually succeed right now. The bot drops the full
  // listing an hour after the sweep that found it, but `matches` never expires,
  // so a cartable match can still be unstageable. Treating `cartable` as if it
  // meant this is what made the cart look broken: the button rendered, the
  // click enqueued, and the bot dropped it with "no fresh listing held".
  // Absent (undefined) on states pushed by a bot older than 2026-08-22 —
  // treat that as "unknown, allow the attempt" rather than blocking.
  stageable?: boolean;
}

// One completed purchase, either auto-buy or a manual confirm. `via`
// distinguishes them since only auto-buy has a rule (steamPct/thirdPct) to
// show; a manual buy just has the price paid.
export interface Purchase {
  id: string;
  watchId: string | null;
  name: string;
  exterior: string;
  site: string;
  price: number;
  float: number | null;
  via: 'auto' | 'manual';
  steamPct: number | null;
  thirdPct: number | null;
  at: number; // epoch ms
  image?: string | null; // added by the API layer, see WatchItem.image
}

// One listing staged in the bot's local cart. Staging spends nothing; only
// checkout does. `canBuy` is evaluated bot-side per adapter (LIS-Skins needs a
// Steam trade link configured), so a false here means checkout will hand the
// item back as a link rather than buy it.
export interface CartItem {
  key: string;
  site: string;
  watchId: string | null;
  name: string;
  price: number;
  float: number | null;
  url: string | null;
  canBuy: boolean;
  addedAt: number;
  // Set when a checkout attempt on this item failed for a reason that looked
  // temporary. A conclusive "gone" failure unstages the item instead, so if
  // this is set the bot still intends to retry it.
  lastError?: string | null;
  lastErrorAt?: number | null;
  image?: string | null; // added by the API layer, see WatchItem.image
}

// The bot's live buy configuration, so the dashboard shows the real ceiling
// rather than repeating a number that might have drifted out of .env.
export interface BuyingConfig {
  enabled: boolean;      // ENABLE_BUY
  maxBuyUsd: number;     // MAX_BUY_USD, per item
  buyableSites: string[]; // adapters that can actually be purchased from
}

// One line of "what the bot did", written by the bot so the dashboard can show
// results without you having to go and read Telegram.
export interface BotEvent {
  id: string;
  at: number;
  level: 'info' | 'good' | 'warn' | 'bad';
  text: string;
  detail: string | null;
}

export interface WatchlistState {
  updatedAt: number;
  watches: WatchItem[];
  matches: WatchMatch[]; // most recent match per watch, from the bot's last sweep
  purchases: Purchase[]; // most recent purchases, newest first
  cart: CartItem[];
  buying: BuyingConfig | null;
  events: BotEvent[];
}

export type OrderStatus = 'top' | 'outbid' | 'ceiling' | 'pending' | 'error';

export interface OrderItem {
  id: string;
  hashName: string;
  status: OrderStatus;
  myCents: number | null;
  maxCents: number;
  highestCents: number | null;
  lowestSellCents: number | null;
  quantity: number;
  lastError: string | null;
  image?: string | null; // added by the API layer, see WatchItem.image
}

// Steam session status, if this bot has steam-auth.cjs's auto-renew wired up
// (Steam Skins / MAIN STEAM SKINS as of when this was built). Null entries
// mean "unknown" (e.g. auto-renew not configured yet), not "expired".
export interface SessionStatus {
  autoRenewOn: boolean;
  accessTokenExpiresAt: number | null;
  refreshTokenExpiresAt: number | null;
}

export interface OrdersState {
  updatedAt: number;
  accountBlocked: string | null; // the circuit-breaker reason, or null if healthy
  orders: OrderItem[];
  session: SessionStatus | null;
}

// Commands the dashboard enqueues; the bot's sync script drains and applies
// them on its own next tick, using the exact same functions its Telegram
// commands already use — no new code path bypasses the existing safety guards.
export type Command =
  | { id: string; type: 'add-watch'; payload: Omit<WatchItem, 'id'> & { id?: string } }
  | { id: string; type: 'remove-watch'; payload: { id: string } }
  | { id: string; type: 'update-watch'; payload: { id: string; maxFloat?: number | null; maxPrice?: number; enabled?: boolean } }
  | { id: string; type: 'place-order'; payload: { orderId: string; targetCents: number; raiseCeiling?: boolean } }
  | { id: string; type: 'cancel-order'; payload: { orderId: string } }
  | { id: string; type: 'update-order-ceiling'; payload: { orderId: string; maxCents: number } }
  | { id: string; type: 'refresh-session'; payload: Record<string, never> }
  | { id: string; type: 'cart-add'; payload: { watchId: string; matchId?: string } }
  | { id: string; type: 'cart-remove'; payload: { key: string } }
  | { id: string; type: 'cart-clear'; payload: Record<string, never> }
  | { id: string; type: 'cart-checkout'; payload: Record<string, never> };
