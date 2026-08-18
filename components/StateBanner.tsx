import { ExclamationTriangleIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

export function SetupBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
      <WrenchScrewdriverIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <p className="font-medium">Redis isn&apos;t connected yet</p>
        <p className="mt-0.5 text-muted-foreground">
          Add the Redis integration in Vercel&apos;s Storage tab, make sure{' '}
          <code className="rounded bg-surface px-1 py-0.5 text-xs">KV_REST_API_URL</code> and{' '}
          <code className="rounded bg-surface px-1 py-0.5 text-xs">KV_REST_API_TOKEN</code> are set, then redeploy.
        </p>
      </div>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
      <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
