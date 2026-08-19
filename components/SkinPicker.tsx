'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import NAMES from '@/data/skin-names.json';
import { inputClass } from '@/components/ui';
import { MagnifyingGlassIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Searchable skin picker for the Add-watch form.
//
// The old free-text field was a real trap: a typo like "AK47 | Redline" saved
// happily and then silently never matched anything, because the bot searches by
// exact market_hash_name. Picking from the real 1,974-name list makes that
// impossible.
//
// The list is bundled (47KB of names) rather than fetched, so it works offline
// and has no request latency on every keystroke.

const ALL = NAMES as string[];
const MAX_SHOWN = 60;

function score(name: string, q: string): number {
  const n = name.toLowerCase();
  const i = n.indexOf(q);
  if (i < 0) return -1;
  // Prefer matches at the start of the name, then at a word boundary.
  if (i === 0) return 0;
  if (n[i - 1] === ' ' || n[i - 1] === '|') return 1;
  return 2;
}

export function SkinPicker({
  value,
  onChange,
  id = 'skin-picker',
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  // Close when focus leaves the whole widget, not just the input, or picking
  // with the mouse would dismiss the list before the click registers.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL.slice(0, MAX_SHOWN);
    const hits: Array<{ name: string; s: number }> = [];
    for (const name of ALL) {
      const s = score(name, q);
      if (s >= 0) hits.push({ name, s });
    }
    hits.sort((a, b) => a.s - b.s || a.name.length - b.name.length);
    return hits.slice(0, MAX_SHOWN).map((h) => h.name);
  }, [query]);

  const exact = ALL.includes(query.trim());

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function pick(name: string) {
    onChange(name);
    setQuery(name);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      if (matches[active]) { e.preventDefault(); pick(matches[active]); }
    } else if (e.key === 'Escape') { setOpen(false); }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <MagnifyingGlassIcon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60"
          aria-hidden="true"
        />
        <input
          id={id}
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search 1,974 skins…"
          className={`${inputClass} w-full pl-9 ${query && !exact ? 'pr-9' : 'pr-9'}`}
        />
        {query && (
          exact ? (
            <CheckIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" aria-hidden="true" />
          ) : (
            <button
              type="button"
              onClick={() => { setQuery(''); onChange(''); setOpen(true); }}
              aria-label="Clear"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          )
        )}
      </div>

      {query && !exact && (
        <p className="mt-1 text-xs text-warning">
          Not an exact skin name — pick one from the list or the bot will never match it.
        </p>
      )}

      {open && (
        <ul
          id={`${id}-list`}
          ref={listRef}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-border-strong bg-surface py-1 shadow-2xl shadow-black/50"
        >
          {matches.map((name, i) => (
            <li key={name} role="option" aria-selected={i === active}>
              <button
                type="button"
                onClick={() => pick(name)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition-colors ${
                  i === active ? 'bg-surface-hover text-foreground' : 'text-muted-foreground'
                }`}
              >
                <span className="truncate">{name}</span>
                {name === value && <CheckIcon className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />}
              </button>
            </li>
          ))}
          {!matches.length && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No skin matches “{query}”.</li>
          )}
        </ul>
      )}
    </div>
  );
}
