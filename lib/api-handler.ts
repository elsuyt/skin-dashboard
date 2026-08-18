import { NextResponse } from 'next/server';
import { RedisNotConfiguredError } from './kv';

// Every route handler gets wrapped in this so a thrown error always comes
// back as JSON the client can actually show, instead of Next's default
// unstyled 500 (which is what a bare "500" on screen came from).
export function withApiErrors<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse>,
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof RedisNotConfiguredError) {
        return NextResponse.json({ error: err.message, code: 'redis_not_configured' }, { status: 503 });
      }
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message, code: 'internal_error' }, { status: 500 });
    }
  };
}
