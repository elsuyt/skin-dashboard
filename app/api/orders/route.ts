import { NextRequest, NextResponse } from 'next/server';
import { botByKey } from '@/lib/bots';
import { getOrdersState } from '@/lib/store';
import { withApiErrors } from '@/lib/api-handler';

export const GET = withApiErrors(async (req: NextRequest) => {
  const bot = req.nextUrl.searchParams.get('bot');
  if (!bot || botByKey(bot)?.kind !== 'orders') {
    return NextResponse.json({ error: 'unknown orders bot' }, { status: 400 });
  }
  const state = await getOrdersState(bot);
  return NextResponse.json(state ?? { updatedAt: 0, accountBlocked: null, orders: [], session: null });
});
