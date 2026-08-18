import { requireRedis } from './kv';
import type { WatchlistState, OrdersState, Command } from './types';

// Keys: state:<botKey> is written ONLY by that bot's sync script and read by
// the dashboard. commands:<botKey> is a list written by the dashboard (RPUSH)
// and drained by that bot's sync script (LPOP) — a simple one-way queue per
// bot, so two bots' commands can never cross wires.
const stateKey = (bot: string) => `state:${bot}`;
const commandsKey = (bot: string) => `commands:${bot}`;

export async function getWatchlistState(bot: string): Promise<WatchlistState | null> {
  const redis = requireRedis();
  return (await redis.get<WatchlistState>(stateKey(bot))) ?? null;
}

export async function getOrdersState(bot: string): Promise<OrdersState | null> {
  const redis = requireRedis();
  return (await redis.get<OrdersState>(stateKey(bot))) ?? null;
}

export async function enqueueCommand(bot: string, cmd: Command): Promise<void> {
  const redis = requireRedis();
  await redis.rpush(commandsKey(bot), JSON.stringify(cmd));
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function makeCommand<T extends Command['type']>(
  type: T,
  payload: Extract<Command, { type: T }>['payload'],
): Command {
  return { id: randomId(), type, payload } as Command;
}
