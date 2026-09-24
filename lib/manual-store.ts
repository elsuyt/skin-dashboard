import { requireRedis } from './kv';
import type { ManualWatch } from './types';

// Storage for the "Manual checking" list on the Watchlists page — skins you
// track by hand, never fed to a bot. Deliberately its own key, `manual:list`,
// disjoint from both `state:<bot>` (written only by a bot's sync script) and
// `commands:<bot>` (drained only by a bot's sync script, see lib/store.ts).
// No bot's sync script has ever heard of this key and never will — that's
// what makes "don't add these to auto-buy" a guarantee rather than a
// convention. If a future feature ever needs this list bot-visible, that is
// a new, explicit decision — don't quietly repoint this at a bot's namespace.
//
// Single flat array under one key, read-modify-written whole. No queue, no
// draining, no eventual consistency: this dashboard is the only reader and
// writer, so there is no concurrent bot to race with the way there is for
// state:<bot>. An edit here is visible on the very next GET, not "within
// ~30s" like a bot-synced watch.
const MANUAL_KEY = 'manual:list';

export async function getManualWatches(): Promise<ManualWatch[]> {
  const redis = requireRedis();
  return (await redis.get<ManualWatch[]>(MANUAL_KEY)) ?? [];
}

async function saveManualWatches(list: ManualWatch[]): Promise<void> {
  const redis = requireRedis();
  await redis.set(MANUAL_KEY, list);
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function addManualWatch(
  input: Omit<ManualWatch, 'id' | 'addedAt'>,
): Promise<ManualWatch> {
  const list = await getManualWatches();
  const entry: ManualWatch = { ...input, id: randomId(), addedAt: Date.now() };
  await saveManualWatches([...list, entry]);
  return entry;
}

export async function removeManualWatch(id: string): Promise<void> {
  const list = await getManualWatches();
  await saveManualWatches(list.filter((w) => w.id !== id));
}
