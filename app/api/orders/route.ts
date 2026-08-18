import { NextRequest, NextResponse } from 'next/server';
import { botByKey } from '@/lib/bots';
import { getOrdersState } from '@/lib/store';
import { withApiErrors } from '@/lib/api-handler';
import { skinImage } from '@/lib/skin-images';

export const GET = withApiErrors(async (req: NextRequest) => {
  const bot = req.nextUrl.searchParams.get('bot');
  if (!bot || botByKey(bot)?.kind !== 'orders') {
    return NextResponse.json({ error: 'unknown orders bot' }, { status: 400 });
  }
  const state = await getOrdersState(bot);
  if (!state) return NextResponse.json({ updatedAt: 0, accountBlocked: null, orders: [], session: null });

  // hashName carries the StatTrak™/★ prefix and the (Exterior) suffix; the
  // lookup peels those off itself, so pass it through whole.
  return NextResponse.json({
    ...state,
    orders: (state.orders ?? []).map((o) => ({ ...o, image: skinImage(o.hashName) })),
  });
});
