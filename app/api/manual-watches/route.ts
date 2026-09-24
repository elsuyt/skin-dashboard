import { NextRequest, NextResponse } from 'next/server';
import { getManualWatches, addManualWatch, removeManualWatch } from '@/lib/manual-store';
import { withApiErrors } from '@/lib/api-handler';
import { skinImage } from '@/lib/skin-images';

// No `bot` param anywhere in this file, on purpose — unlike /api/watches,
// there is no bot on the other end of this data. See lib/manual-store.ts for
// why that's a structural guarantee, not just a habit.

export const GET = withApiErrors(async () => {
  const watches = await getManualWatches();
  return NextResponse.json({
    watches: watches.map((w) => ({ ...w, image: skinImage(w.name) })),
  });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const body = await req.json();
  const { watch } = body;
  if (!watch?.name || !watch?.exterior || !(watch?.maxPrice > 0)) {
    return NextResponse.json({ error: 'name, exterior and a positive maxPrice are required' }, { status: 400 });
  }
  const saved = await addManualWatch({
    name: String(watch.name),
    exterior: String(watch.exterior),
    stattrak: !!watch.stattrak,
    maxFloat: watch.maxFloat != null && watch.maxFloat !== '' ? Number(watch.maxFloat) : null,
    maxPrice: Number(watch.maxPrice),
  });
  return NextResponse.json({ ok: true, watch: { ...saved, image: skinImage(saved.name) } });
});

export const DELETE = withApiErrors(async (req: NextRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await removeManualWatch(id);
  return NextResponse.json({ ok: true });
});
