import { Redis } from '@upstash/redis';

// Works with either naming convention: Vercel Marketplace's Redis integration
// injects KV_REST_API_URL/TOKEN, a raw Upstash console project gives you
// UPSTASH_REDIS_REST_URL/TOKEN. Support both so setup isn't order-dependent.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  // Thrown lazily (only when a route actually touches Redis), so the build
  // itself doesn't fail before the env vars are set in Vercel.
  console.warn('[kv] No Redis env vars found yet — set up the Redis integration in Vercel.');
}

export const redis = url && token ? new Redis({ url, token }) : null;

export function requireRedis(): Redis {
  if (!redis) {
    throw new Error('Redis is not configured. Add the Redis integration in your Vercel project (Storage tab), then redeploy.');
  }
  return redis;
}
