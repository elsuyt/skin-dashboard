import { Redis } from '@upstash/redis';

// Works with either naming convention: Vercel Marketplace's Redis integration
// injects KV_REST_API_URL/TOKEN, a raw Upstash console project gives you
// UPSTASH_REDIS_REST_URL/TOKEN. Support both so setup isn't order-dependent.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

// A distinct error type so routes can tell "Redis isn't set up yet" (show a
// calm setup message) apart from "Redis is set up but the call itself
// failed" (show a real error) — both used to render as an unstyled 500.
export class RedisNotConfiguredError extends Error {
  constructor() {
    super('Redis is not configured yet. Add the Redis integration in Vercel (Storage tab), set the env vars, and redeploy.');
    this.name = 'RedisNotConfiguredError';
  }
}

export function requireRedis(): Redis {
  if (!redis) throw new RedisNotConfiguredError();
  return redis;
}
