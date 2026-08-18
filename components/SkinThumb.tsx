'use client';
import { useState } from 'react';

// Skin artwork tile. Steam's CDN images are transparent PNGs on no background,
// so they need their own surface behind them to not float oddly in a dark table.
// Falls back to a monogram when the name isn't in the snapshot (new releases,
// or an item the dataset spells differently) — never a broken-image icon.

const SIZES = {
  sm: { box: 'h-9 w-12', text: 'text-[10px]' },
  md: { box: 'h-12 w-16', text: 'text-xs' },
} as const;

export function SkinThumb({
  image,
  name,
  size = 'sm',
}: {
  image?: string | null;
  name: string;
  size?: keyof typeof SIZES;
}) {
  const [failed, setFailed] = useState(false);
  const s = SIZES[size];
  const show = image && !failed;

  return (
    <span
      className={`${s.box} grid shrink-0 place-items-center overflow-hidden rounded-md border border-border/70 bg-surface-hover`}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-0.5"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={`${s.text} font-semibold text-muted-foreground/70`} aria-hidden="true">
          {name.replace(/^(★\s*)?(StatTrak™|Souvenir)\s*/i, '').slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}
