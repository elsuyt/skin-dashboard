// Server-side skin artwork lookup.
//
// The images are Steam's own CDN URLs, taken from the public ByMykel/CSGO-API
// dataset and snapshotted into data/skin-images.json at build time. It is a
// snapshot on purpose: fetching the 5.4MB upstream file at runtime would blow
// past Next's fetch-cache limit and put a cold-start network call in front of
// every dashboard load. Refresh it with:
//
//   curl -sL https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json
//
// then re-run the compaction (see SETUP.md). Missing names just render the
// fallback tile, so a stale snapshot degrades quietly rather than breaking.

import raw from '@/data/skin-images.json';

const data = raw as { prefix: string; skins: Record<string, string> };

// Vanilla knives/gloves carry a ★, StatTrak™ and Souvenir are prefixes, and the
// exterior is a parenthesised suffix. None of those are part of the dataset's
// key, so peel them off progressively rather than giving up on the first miss.
function candidates(name: string): string[] {
  const out: string[] = [];
  let n = name.trim();
  out.push(n);

  const noExterior = n.replace(/\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i, '').trim();
  if (noExterior !== n) out.push(noExterior);
  n = noExterior;

  const stripped = n.replace(/^(★\s*)?(StatTrak™|StatTrak|Souvenir)\s*/i, '').trim();
  if (stripped && stripped !== n) {
    out.push(stripped);
    out.push(`★ ${stripped}`);
  }
  const noStar = n.replace(/^★\s*/, '').trim();
  if (noStar && noStar !== n) out.push(noStar);

  return out;
}

/** Full Steam CDN image URL for a skin, or null when the name isn't known. */
export function skinImage(name: string | null | undefined): string | null {
  if (!name) return null;
  for (const key of candidates(name)) {
    const hit = data.skins[key];
    if (hit) return data.prefix + hit;
  }
  return null;
}
