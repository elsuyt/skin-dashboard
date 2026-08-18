import { NextRequest, NextResponse } from 'next/server';
import { botByKey } from '@/lib/bots';
import { getWatchlistState, enqueueCommand, makeCommand } from '@/lib/store';
import { withApiErrors } from '@/lib/api-handler';

export const GET = withApiErrors(async (req: NextRequest) => {
  const bot = req.nextUrl.searchParams.get('bot');
  if (!bot || botByKey(bot)?.kind !== 'watchlist') {
    return NextResponse.json({ error: 'unknown watchlist bot' }, { status: 400 });
  }
  const state = await getWatchlistState(bot);
  return NextResponse.json(state ?? { updatedAt: 0, watches: [], matches: [] });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const body = await req.json();
  const { bot, watch } = body;
  if (!bot || botByKey(bot)?.kind !== 'watchlist') {
    return NextResponse.json({ error: 'unknown watchlist bot' }, { status: 400 });
  }
  if (!watch?.name || !watch?.exterior || !(watch?.maxPrice > 0)) {
    return NextResponse.json({ error: 'name, exterior and a positive maxPrice are required' }, { status: 400 });
  }
  await enqueueCommand(bot, makeCommand('add-watch', {
    name: watch.name,
    exterior: watch.exterior,
    stattrak: !!watch.stattrak,
    maxFloat: watch.maxFloat != null ? Number(watch.maxFloat) : null,
    maxPrice: Number(watch.maxPrice),
    sites: Array.isArray(watch.sites) && watch.sites.length ? watch.sites : ['csfloat', 'dmarket', 'lisskins', 'tradeit'],
    enabled: true,
    id: watch.id,
  }));
  return NextResponse.json({ ok: true, queued: true });
});

export const DELETE = withApiErrors(async (req: NextRequest) => {
  const bot = req.nextUrl.searchParams.get('bot');
  const id = req.nextUrl.searchParams.get('id');
  if (!bot || botByKey(bot)?.kind !== 'watchlist' || !id) {
    return NextResponse.json({ error: 'bot and id are required' }, { status: 400 });
  }
  await enqueueCommand(bot, makeCommand('remove-watch', { id }));
  return NextResponse.json({ ok: true, queued: true });
});

export const PATCH = withApiErrors(async (req: NextRequest) => {
  const body = await req.json();
  const { bot, id, maxFloat, maxPrice, enabled } = body;
  if (!bot || botByKey(bot)?.kind !== 'watchlist' || !id) {
    return NextResponse.json({ error: 'bot and id are required' }, { status: 400 });
  }
  await enqueueCommand(bot, makeCommand('update-watch', {
    id,
    ...(maxFloat !== undefined ? { maxFloat: maxFloat === null ? null : Number(maxFloat) } : {}),
    ...(maxPrice !== undefined ? { maxPrice: Number(maxPrice) } : {}),
    ...(enabled !== undefined ? { enabled: !!enabled } : {}),
  }));
  return NextResponse.json({ ok: true, queued: true });
});
