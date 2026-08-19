'use client';
import type { BotEvent } from '@/lib/types';
import {
  CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon,
  InformationCircleIcon, BoltIcon,
} from '@heroicons/react/24/outline';

// What the bot actually did, shown here so a checkout result does not require
// going and reading Telegram. The bot writes these; the dashboard only renders.

const LEVELS = {
  good: { icon: CheckCircleIcon, cls: 'text-success', ring: 'bg-success/12' },
  warn: { icon: ExclamationTriangleIcon, cls: 'text-warning', ring: 'bg-warning/12' },
  bad: { icon: XCircleIcon, cls: 'text-destructive', ring: 'bg-destructive/12' },
  info: { icon: InformationCircleIcon, cls: 'text-muted-foreground', ring: 'bg-surface-hover' },
} as const;

function ago(at: number) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(h < 10 ? 1 : 0)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function ActivityFeed({
  events,
  limit,
  emptyText = 'Nothing yet. Actions the bot takes will appear here.',
}: {
  events: BotEvent[];
  limit?: number;
  emptyText?: string;
}) {
  const list = limit ? events.slice(0, limit) : events;

  if (!list.length) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
        <BoltIcon className="h-6 w-6 text-muted-foreground/40" aria-hidden="true" />
        {emptyText}
      </div>
    );
  }

  return (
    <ol className="divide-y divide-border/60">
      {list.map((e) => {
        const L = LEVELS[e.level] ?? LEVELS.info;
        const Icon = L.icon;
        return (
          <li key={e.id} className="flex items-start gap-3 px-4 py-3">
            <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${L.ring}`}>
              <Icon className={`h-3.5 w-3.5 ${L.cls}`} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">{e.text}</p>
              {e.detail && <p className="mt-0.5 text-xs text-muted-foreground">{e.detail}</p>}
            </div>
            <time
              className="shrink-0 whitespace-nowrap text-xs text-muted-foreground/70"
              dateTime={new Date(e.at).toISOString()}
              title={new Date(e.at).toLocaleString()}
            >
              {ago(e.at)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
