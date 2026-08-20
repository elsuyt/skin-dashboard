import { NextRequest, NextResponse } from 'next/server';
import { botByKey } from '@/lib/bots';
import { enqueueCommand, makeCommand } from '@/lib/store';
import { withApiErrors } from '@/lib/api-handler';

// Staging and checkout are separate routes on purpose: everything here except
// action:"checkout" spends nothing, and the one that does spend goes through
// the bot's own checkout.buyCart() — the same function the Telegram /buy
// confirm calls, with the same ENABLE_BUY / canBuy / MAX_BUY_USD guards.
// Nothing in this file can bypass them; it only enqueues a request.

function requireWatchlistBot(bot: unknown): NextResponse | null {
  if (typeof bot !== 'string' || botByKey(bot)?.kind !== 'watchlist') {
    return NextResponse.json({ error: 'unknown watchlist bot' }, { status: 400 });
  }
  return null;
}

export const POST = withApiErrors(async (req: NextRequest) => {
  const { bot, action, watchId, matchId } = await req.json();
  const bad = requireWatchlistBot(bot);
  if (bad) return bad;

  if (action === 'add') {
    if (!watchId || typeof watchId !== 'string') {
      return NextResponse.json({ error: 'watchId is required' }, { status: 400 });
    }
    if (matchId != null && typeof matchId !== 'string') {
      return NextResponse.json({ error: 'matchId must be a string' }, { status: 400 });
    }
    // No matchId = stage the cheapest listing the bot still holds for the watch.
    await enqueueCommand(bot, makeCommand('cart-add', { watchId, matchId }));
    return NextResponse.json({ ok: true, queued: true });
  }

  if (action === 'checkout') {
    await enqueueCommand(bot, makeCommand('cart-checkout', {}));
    return NextResponse.json({ ok: true, queued: true });
  }

  return NextResponse.json({ error: 'action must be "add" or "checkout"' }, { status: 400 });
});

export const DELETE = withApiErrors(async (req: NextRequest) => {
  const bot = req.nextUrl.searchParams.get('bot');
  const key = req.nextUrl.searchParams.get('key');
  const bad = requireWatchlistBot(bot);
  if (bad) return bad;

  // No key = empty the whole cart. Still spends nothing.
  if (key) {
    await enqueueCommand(bot!, makeCommand('cart-remove', { key }));
  } else {
    await enqueueCommand(bot!, makeCommand('cart-clear', {}));
  }
  return NextResponse.json({ ok: true, queued: true });
});
