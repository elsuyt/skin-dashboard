import type { ReactNode } from 'react';

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">{children}</div>;
}

export function PageHead({
  title,
  subtitle,
  count,
  actions,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {count != null && (
            <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground tabular">
              {count}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'success' | 'accent' | 'destructive';
}) {
  const toneClass = {
    default: 'text-foreground',
    success: 'text-success',
    accent: 'text-accent',
    destructive: 'text-destructive',
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-surface/50 px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-xl border border-border bg-surface/40 ${className}`}>{children}</div>;
}

export function TableWrap({ children, maxHeight }: { children: ReactNode; maxHeight?: string }) {
  return (
    <Card>
      <div
        className={`overflow-x-auto ${maxHeight ? 'sticky-head overflow-y-auto' : ''}`}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {children}
      </div>
    </Card>
  );
}

export function Th({ children, right = false }: { children?: ReactNode; right?: boolean }) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground/70 ${
        right ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

export function Empty({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-16 text-center text-sm text-muted-foreground">
      {icon}
      {children}
    </div>
  );
}

export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-surface/70" />
      ))}
    </div>
  );
}

/** Coloured status pill, matching the reference dashboards' dot+label style. */
export function Pill({
  tone,
  children,
}: {
  tone: 'success' | 'warning' | 'destructive' | 'muted' | 'accent';
  children: ReactNode;
}) {
  const map = {
    success: 'bg-success/12 text-success',
    warning: 'bg-warning/12 text-warning',
    destructive: 'bg-destructive/12 text-destructive',
    muted: 'bg-surface-hover text-muted-foreground',
    accent: 'bg-accent/12 text-accent',
  }[tone];
  const dot = {
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
    muted: 'bg-muted-foreground',
    accent: 'bg-accent',
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${map}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {children}
    </span>
  );
}

export const inputClass =
  'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring';

export const btnPrimary =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50';

export const btnGhost =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:cursor-default disabled:opacity-50';
