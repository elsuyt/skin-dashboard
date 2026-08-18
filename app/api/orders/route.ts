import { NextRequest, NextResponse } from 'next/server';
import { botByKey } from '@/lib/bots';
import { getOrdersState, enqueueCommand, makeCommand } from '@/lib/store';

export async function GET(req: NextRequest) {
  const bot = req.nextUrl.searchParams.get('bot');
  if (!bot || botByKey(bot)?.kind !== 'orders') {
    return NextResponse.json({ error: 'unknown orders bot' }, { status: 400 });
  }
  const state = await getOrdersState(bot);
  return NextResponse.json(state ?? { updatedAt: 0, accountBlocked: null, orders: [] });
}
