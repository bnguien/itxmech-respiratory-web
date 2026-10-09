"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { LungSound } from "@/types/clinical";
import { cycleLabelStyles, legacyCycleLabel } from "@/lib/recordings/presentation";

const options: LungSound[] = [
  "Normal",
  "Crackles",
  "Wheezes",
  "Crackles + Wheezes",
];

const optionColor = (value: LungSound) => cycleLabelStyles[legacyCycleLabel[value]].text;

interface CycleClassificationSelectProps {
  value: LungSound;
  onChange: (value: LungSound) => void;
}

export function CycleClassificationSelect({
  value,
  onChange,
}: CycleClassificationSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 text-left text-sm font-semibold outline-none transition-colors ${open ? "border-[#2F78C8] ring-2 ring-[#D9EAFB]" : "border-[#DDEAF8] hover:border-[#AFCFEE]"}`}
      >
        <span className={`truncate ${optionColor(value)}`}>{value}</span>
        <ChevronDown
          size={17}
          className={`shrink-0 text-[#5A7799] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-[#DDEAF8] bg-white p-1.5 shadow-[0_12px_35px_rgba(23,58,94,.16)]"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${option === value ? "bg-[#EEF6FD]" : "hover:bg-[#F7FAFD]"}`}
            >
              <span className={optionColor(option)}>{option}</span>
              {option === value && (
                <Check size={16} className="shrink-0 text-[#2F78C8]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
