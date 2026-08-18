import { NextRequest, NextResponse } from 'next/server';
import { botByKey } from '@/lib/bots';
import { enqueueCommand, makeCommand } from '@/lib/store';
import { withApiErrors } from '@/lib/api-handler';

// Queues a manual steamLoginSecure refresh. Calls the exact same
// auth.refreshAccessToken() the bot's own 30-minute auto-check and its
// Telegram /refresh command already use — this is a third trigger for the
// same function, not a new one. Does nothing if that bot has no
// STEAM_REFRESH configured yet (the command handler reports back via the
// bot's own log, same as every other path here).
export const POST = withApiErrors(async (req: NextRequest) => {
  const { bot } = await req.json();
  if (!bot || botByKey(bot)?.kind !== 'orders') {
    return NextResponse.json({ error: 'unknown orders bot' }, { status: 400 });
  }
  await enqueueCommand(bot, makeCommand('refresh-session', {}));
  return NextResponse.json({ ok: true, queued: true });
});
