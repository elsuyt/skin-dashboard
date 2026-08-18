import { NextRequest, NextResponse } from 'next/server';
import { botByKey } from '@/lib/bots';
import { enqueueCommand, makeCommand } from '@/lib/store';

// Queues a real-money action. It reuses the bot's own placeAt(), which still
// enforces every existing guard (ask floor, per-item ceiling, global cap,
// 24h cap, escalation, account circuit breaker) — this route only supplies
// the "someone tapped confirm" trigger, same as the Telegram flow.
export async function POST(req: NextRequest) {
  const { bot, orderId, targetCents, raiseCeiling } = await req.json();
  if (!bot || botByKey(bot)?.kind !== 'orders' || !orderId || !(targetCents > 0)) {
    return NextResponse.json({ error: 'bot, orderId and a positive targetCents are required' }, { status: 400 });
  }
  await enqueueCommand(bot, makeCommand('place-order', {
    orderId,
    targetCents: Math.round(targetCents),
    raiseCeiling: !!raiseCeiling,
  }));
  return NextResponse.json({ ok: true, queued: true });
}
