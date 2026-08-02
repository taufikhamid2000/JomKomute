"use client";

import { useEffect, useId, useState } from "react";

// A typeable, filterable <select> replacement — plain HTML selects don't
// scale to a 187-station list. Follows the standard ARIA combobox +
// listbox pattern: text input filters the options, arrow keys move a
// highlighted option, Enter/click selects it. Purely controlled by
// `value`/`onChange`, same shape as the native selects it replaces.
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  noResultsLabel,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  noResultsLabel: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  // Stay in sync with `value` changing from outside (line switched, form
  // reset, etc.) — but not while the dropdown is open and the user is
  // mid-type, or every keystroke would get clobbered.
  useEffect(() => {
    if (!open) setQuery(value);
  }, [value, open]);

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed ? options.filter((o) => o.toLowerCase().includes(trimmed)) : options;

  useEffect(() => {
    setHighlighted(0);
  }, [query, open]);

  function select(option: string) {
    onChange(option);
    setQuery(option);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[highlighted]) select(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(value);
    }
  }

  const listboxId = `${id}-listbox`;

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[highlighted] ? `${id}-option-${highlighted}` : undefined}
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setOpen(false);
          setQuery(value);
        }}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-foreground/40">{noResultsLabel}</li>
          ) : (
            filtered.map((option, i) => (
              <li
                key={option}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={option === value}
                // Keeps focus on the input during the click so onBlur's
                // revert-to-last-value doesn't fire before onClick runs.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(option)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  i === highlighted ? "bg-muted text-foreground" : "text-foreground/80 hover:bg-muted"
                }`}
              >
                {option}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
