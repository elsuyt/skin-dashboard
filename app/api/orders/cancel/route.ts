import { NextRequest, NextResponse } from 'next/server';
import { botByKey } from '@/lib/bots';
import { enqueueCommand, makeCommand } from '@/lib/store';

export async function POST(req: NextRequest) {
  const { bot, orderId } = await req.json();
  if (!bot || botByKey(bot)?.kind !== 'orders' || !orderId) {
    return NextResponse.json({ error: 'bot and orderId are required' }, { status: 400 });
  }
  await enqueueCommand(bot, makeCommand('cancel-order', { orderId }));
  return NextResponse.json({ ok: true, queued: true });
}
