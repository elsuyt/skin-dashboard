'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowTopRightOnSquareIcon, ClipboardDocumentIcon, StopIcon, CheckIcon } from '@heroicons/react/24/outline';

// Bulk "open every link" button.
//
// Pacing is copied from the bot's own csmoney-links.cjs page and is not
// arbitrary: 6 tabs every 3.5s, because firing 50-odd requests at a
// Cloudflare-protected host at once is a good way to get challenged or
// throttled. Do not raise it "to be faster".
//
// Popup blockers are the real failure mode here. Only the tabs opened in the
// first click's gesture window are reliably allowed; later batches fire from a
// timer and browsers commonly block them. window.open() returns null when
// blocked, so that is detected and reported rather than silently doing nothing,
// and the Copy button is always there as the fallback.
const BATCH_SIZE = 6;
const BATCH_GAP_MS = 3500;

export function OpenAllLinks({
  label,
  links,
  className = '',
}: {
  label: string;
  links: string[];
  className?: string;
}) {
  const [opened, setOpened] = useState(0);
  const [running, setRunning] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const cancelled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function stop() {
    cancelled.current = true;
    if (timer.current) clearTimeout(timer.current);
    setRunning(false);
  }

  function openAll() {
    if (!links.length || running) return;
    cancelled.current = false;
    setBlocked(false);
    setOpened(0);
    setRunning(true);

    let i = 0;
    const step = () => {
      if (cancelled.current) return;
      const batch = links.slice(i, i + BATCH_SIZE);
      if (!batch.length) { setRunning(false); return; }

      let blockedHere = 0;
      for (const url of batch) {
        const w = window.open(url, '_blank', 'noopener');
        if (!w) blockedHere++;
      }
      if (blockedHere) setBlocked(true);

      i += batch.length;
      setOpened(i);
      timer.current = setTimeout(step, BATCH_GAP_MS);
    };
    step();
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(links.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  const disabled = !links.length;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        onClick={openAll}
        disabled={disabled || running}
        title={`Opens in batches of ${BATCH_SIZE}, ${BATCH_GAP_MS / 1000}s apart, to avoid tripping the site's bot check`}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:cursor-default disabled:opacity-50"
      >
        <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
        {running ? `Opening ${opened}/${links.length}…` : `Open all ${label}`}
        {!running && !disabled && (
          <span className="rounded bg-surface-hover px-1.5 py-0.5 text-xs tabular text-muted-foreground">{links.length}</span>
        )}
      </button>

      {running && (
        <button
          onClick={stop}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
        >
          <StopIcon className="h-4 w-4" aria-hidden="true" />
          Stop
        </button>
      )}

      <button
        onClick={copyAll}
        disabled={disabled}
        title="Copy every link, one per line"
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-50"
      >
        {copied
          ? <CheckIcon className="h-4 w-4 text-success" aria-hidden="true" />
          : <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy'}
      </button>

      {/* Announced politely so a screen reader hears progress without focus moving. */}
      <span aria-live="polite" className="sr-only">
        {running ? `Opened ${opened} of ${links.length}` : opened ? `Finished, opened ${opened}` : ''}
      </span>

      {blocked && (
        <span className="text-xs text-warning">
          Your browser blocked some tabs — allow pop-ups for this site, or use Copy.
        </span>
      )}
    </div>
  );
}
