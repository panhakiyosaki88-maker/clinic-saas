"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

export interface MedicinePickOption {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
}

/**
 * Medicine-name typeahead over the pharmacy catalog for billing a manual Pharmacy
 * line. Typing filters the catalog and shows each medicine's stock; picking one
 * fills the description (and its selling price, handled by the caller). Mirrors
 * the New Prescription medicine input.
 */
export function MedicinePicker({
  value,
  medicines,
  onType,
  onPick,
  placeholder = "Medicine",
}: {
  value: string;
  medicines: MedicinePickOption[];
  onType: (v: string) => void;
  onPick: (m: MedicinePickOption) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const matches = React.useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q ? medicines.filter((m) => m.name.toLowerCase().includes(q)) : medicines;
    return list.slice(0, 8);
  }, [value, medicines]);

  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function choose(m: MedicinePickOption) {
    onPick(m);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onType(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(matches[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] py-1 text-sm shadow-lg">
          {matches.map((m, i) => {
            const out = m.stock_quantity <= 0;
            return (
              <li
                key={m.id}
                className={`flex items-center ${i === highlight ? "bg-slate-100 dark:bg-slate-800" : ""}`}
                onMouseEnter={() => setHighlight(i)}
              >
                <button
                  type="button"
                  className="flex flex-1 items-center justify-between gap-2 px-3 py-1.5 text-left"
                  onClick={() => choose(m)}
                >
                  <span className="truncate">
                    {m.name}
                    <span className="ml-1 text-xs text-[var(--muted-foreground)]">${m.selling_price.toFixed(2)}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      out
                        ? "bg-[var(--destructive)]/10 text-[var(--destructive)]"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {out ? "Out of stock" : `${m.stock_quantity} in stock`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
