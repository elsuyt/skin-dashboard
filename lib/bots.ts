// Static registry of every local bot this dashboard talks to. The bot-side
// sync script (dashboard-sync.cjs) reads its own `key` from an env var and
// only ever touches its own namespace in Redis — the dashboard is read/write,
// each bot is the only writer of its own `state:<key>` and only reader of its
// own `commands:<key>`.
export type BotKind = 'watchlist' | 'orders';

export interface BotDef {
  key: string;
  label: string;
  kind: BotKind;
  account: string; // which Steam account this bot acts on, for the account filter
}

export const BOTS: BotDef[] = [
  { key: 'skin-sniper', label: 'skin-sniper', kind: 'watchlist', account: 'Account #1' },
  { key: 'skin-sniper-3', label: 'skin-sniper account #3', kind: 'watchlist', account: 'Account #3' },
  { key: 'steam-skins', label: 'Steam Skins', kind: 'orders', account: 'Account #2' },
  { key: 'main-steam-skins', label: 'MAIN STEAM SKINS', kind: 'orders', account: 'Account #1' },
  { key: 'bo-account-3', label: 'BO - Account #3', kind: 'orders', account: 'Account #3' },
];

export function botByKey(key: string): BotDef | undefined {
  return BOTS.find((b) => b.key === key);
}

export const ACCOUNTS = Array.from(new Set(BOTS.map((b) => b.account))).sort();
