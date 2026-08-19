'use client';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { btnGhost, btnPrimary, inputClass } from '@/components/ui';
import type { SessionStatus } from '@/lib/types';
import {
  ArrowPathIcon, CheckCircleIcon, ClockIcon, ShieldExclamationIcon,
  KeyIcon, ChevronDownIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';

function timeUntil(ts: number | null) {
  if (ts == null) return null;
  const ms = ts - Date.now();
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.round(ms / 60_000)}m`;
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function SessionPanel({
  botKey,
  botLabel,
  session,
  onApplied,
}: {
  botKey: string;
  botLabel: string;
  session: SessionStatus | null;
  onApplied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [cookie, setCookie] = useState('');
  const [sessionid, setSessionid] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshQueued, setRefreshQueued] = useState(false);

  const accessLeft = session ? timeUntil(session.accessTokenExpiresAt) : null;
  const refreshLeft = session ? timeUntil(session.refreshTokenExpiresAt) : null;
  const expired = accessLeft === 'expired';

  async function doRefresh() {
    setRefreshing(true);
    setErr('');
    try {
      await api.refreshSession(botKey);
      setRefreshQueued(true);
      setTimeout(onApplied, 5000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }

  async function submitPaste(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setDone('');
    try {
      const res = await api.pushSession(botKey, cookie, sessionid);
      // Only non-secret facts come back; the credential is never re-rendered.
      const left = res.expiresAt ? timeUntil(res.expiresAt) : null;
      setDone(`Sent for ${res.steamId}${left ? ` · valid ${left}` : ''}. The bot installs it within ~30s.`);
      setCookie('');
      setSessionid('');
      setTimeout(onApplied, 35000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface/50">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 text-sm">
        <span className="flex items-center gap-1.5">
          {!session ? (
            <ClockIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ) : expired ? (
            <ShieldExclamationIcon className="h-4 w-4 text-destructive" aria-hidden="true" />
          ) : (
            <CheckCircleIcon className="h-4 w-4 text-success" aria-hidden="true" />
          )}
          <span className="font-medium">Steam session</span>
        </span>

        {session ? (
          <>
            <span className="text-muted-foreground">
              steamLoginSecure{' '}
              {expired ? (
                <span className="font-medium text-destructive">expired</span>
              ) : (
                <span className="tabular text-foreground">{accessLeft} left</span>
              )}
            </span>
            <span className="text-muted-foreground">
              refresh token <span className="tabular text-foreground">{refreshLeft ?? '—'}</span>
            </span>
            <span className={session.autoRenewOn ? 'text-success' : 'text-warning'}>
              {session.autoRenewOn ? 'auto-renew on' : 'auto-renew not configured'}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">this bot has not reported a session yet</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button onClick={doRefresh} disabled={refreshing || refreshQueued} className={btnGhost}>
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {refreshQueued ? 'Queued' : 'Auto-renew now'}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-expanded={open}
          >
            {open ? <ChevronDownIcon className="h-4 w-4" aria-hidden="true" /> : <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />}
            Paste a session
          </button>
        </div>
      </div>

      {open && (
        <form onSubmit={submitPaste} className="border-t border-border px-4 py-4">
          <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
            <KeyIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p>
                For <span className="text-foreground">{botLabel}</span>. In a browser logged into that account:
                F12 → Application → Cookies → <code className="rounded bg-surface px-1">steamcommunity.com</code>, and copy{' '}
                <code className="rounded bg-surface px-1">steamLoginSecure</code>.
              </p>
              <p className="mt-1">
                This is a full account credential. It is sent once, held under a 10-minute expiry, and deleted the moment
                the bot installs it — it is never stored or shown again. It does <span className="text-foreground">not</span> clear a Steam
                Mobile App confirmation requirement; that is an account setting, not a session problem.
              </p>
            </div>
          </div>

          <label htmlFor={`cookie-${botKey}`} className="mt-4 block text-sm font-medium">
            steamLoginSecure
          </label>
          <textarea
            id={`cookie-${botKey}`}
            value={cookie}
            onChange={(e) => setCookie(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder="76561198…%7C%7CeyAidHlwIjogIkpXVCIs…"
            className={`${inputClass} mt-1.5 w-full font-mono text-xs`}
          />

          <label htmlFor={`sid-${botKey}`} className="mt-3 block text-sm font-medium">
            sessionid <span className="font-normal text-muted-foreground">— optional, leave blank to keep the current one</span>
          </label>
          <input
            id={`sid-${botKey}`}
            value={sessionid}
            onChange={(e) => setSessionid(e.target.value)}
            spellCheck={false}
            placeholder="a1b2c3d4e5f6…"
            className={`${inputClass} mt-1.5 w-full font-mono text-xs`}
          />

          {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
          {done && <p className="mt-3 text-sm text-success">{done}</p>}

          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={busy || !cookie.trim()} className={btnPrimary}>
              {busy ? 'Sending…' : 'Install session'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setCookie(''); setSessionid(''); setErr(''); setDone(''); }}
              className="cursor-pointer px-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
