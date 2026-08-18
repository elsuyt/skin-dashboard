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
}

// One current best-known listing for a watch, as of the bot's last sweep.
// Absent (undefined) fields mean the bot hasn't matched that watch recently.
export interface WatchMatch {
  watchId: string;
  site: string;
  price: number;
  float: number | null;
  steamPrice: number | null;
  thirdLowPrice: number | null;
  url: string | null;
  seenAt: number; // epoch ms
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
}

export interface WatchlistState {
  updatedAt: number;
  watches: WatchItem[];
  matches: WatchMatch[]; // most recent match per watch, from the bot's last sweep
  purchases: Purchase[]; // most recent purchases, newest first
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
  | { id: string; type: 'refresh-session'; payload: Record<string, never> };
