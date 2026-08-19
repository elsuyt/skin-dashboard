import { NextRequest, NextResponse } from 'next/server';
import { botByKey } from '@/lib/bots';
import { putSessionUpdate } from '@/lib/store';
import { withApiErrors } from '@/lib/api-handler';

// Accepts a Steam session pasted out of the browser and hands it to the bot.
//
// This is a full account credential, so it is handled differently from every
// other command:
//   - it goes to a TTL'd key, never the durable command queue, so an offline
//     bot cannot leave it sitting in Redis
//   - the bot deletes the key as soon as it applies it
//   - it is never echoed back in any GET response, and never logged in full
//
// It intentionally does NOT clear a Steam Mobile App confirmation requirement
// (code 22) — that is an account-level policy, not a session problem. This
// exists for when the refresh token expires or gets revoked.

// steamLoginSecure is "<steamid>||<jwt>", usually URL-encoded as %7C%7C.
const COOKIE_RE = /^\s*(\d{17})(?:\|\||%7C%7C)([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\s*$/;

export const POST = withApiErrors(async (req: NextRequest) => {
  const { bot, cookie, sessionid } = await req.json();

  if (!bot || botByKey(bot)?.kind !== 'orders') {
    return NextResponse.json({ error: 'unknown orders bot' }, { status: 400 });
  }
  if (typeof cookie !== 'string' || !cookie.trim()) {
    return NextResponse.json({ error: 'steamLoginSecure value is required' }, { status: 400 });
  }

  // Validate the shape here so a typo is caught in the browser rather than
  // silently overwriting a working cookie with junk on the bot.
  const raw = cookie.trim().replace(/^steamLoginSecure=/i, '');
  const m = raw.match(COOKIE_RE);
  if (!m) {
    return NextResponse.json(
      { error: 'That does not look like a steamLoginSecure value. Expected 17-digit steamID, then || (or %7C%7C), then a JWT.' },
      { status: 400 },
    );
  }

  // Reject an already-expired token rather than installing it and letting the
  // bot fail on its next Steam call.
  let steamId = m[1];
  let expSeconds: number | null = null;
  try {
    const claims = JSON.parse(Buffer.from(m[2].split('.')[1], 'base64').toString());
    expSeconds = typeof claims.exp === 'number' ? claims.exp : null;
    if (claims.sub && claims.sub !== steamId) {
      return NextResponse.json({ error: 'steamID in the cookie does not match the token it contains' }, { status: 400 });
    }
    steamId = claims.sub || steamId;
  } catch {
    return NextResponse.json({ error: 'could not read the token inside that cookie' }, { status: 400 });
  }
  if (expSeconds != null && expSeconds * 1000 <= Date.now()) {
    return NextResponse.json({ error: 'that token has already expired — copy a fresh one' }, { status: 400 });
  }

  if (sessionid != null && (typeof sessionid !== 'string' || !/^[A-Za-z0-9]{0,64}$/.test(sessionid.trim()))) {
    return NextResponse.json({ error: 'sessionid must be alphanumeric' }, { status: 400 });
  }

  await putSessionUpdate(bot, {
    cookie: raw,
    sessionid: typeof sessionid === 'string' && sessionid.trim() ? sessionid.trim() : undefined,
    at: Date.now(),
  });

  // Echo back only non-secret facts, so the UI can confirm which account was
  // targeted without ever rendering the credential again.
  return NextResponse.json({
    ok: true,
    queued: true,
    steamId,
    expiresAt: expSeconds != null ? expSeconds * 1000 : null,
  });
});
