import { NextRequest, NextResponse } from 'next/server';
import { getInventory, CsfloatNotConfiguredError } from '@/lib/inventory';
import { withApiErrors } from '@/lib/api-handler';

export const GET = withApiErrors(async (req: NextRequest) => {
  const force = req.nextUrl.searchParams.get('refresh') === '1';
  try {
    return NextResponse.json(await getInventory(force));
  } catch (err) {
    if (err instanceof CsfloatNotConfiguredError) {
      return NextResponse.json({ error: err.message, code: 'csfloat_not_configured' }, { status: 503 });
    }
    throw err;
  }
});
