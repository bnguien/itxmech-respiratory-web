"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { PatientGender } from "@/types/patient";

const months = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const genderOptions: { value: PatientGender; label: string }[] = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
];

function toDisplay(value: string) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return matched ? `${matched[3]}/${matched[2]}/${matched[1]}` : "";
}

function parseDate(value: string) {
  const matched = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!matched) return null;
  const [, day, month, year] = matched;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
}

function toDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PatientDateField({ name, defaultValue = "", required = false }: { name: string; defaultValue?: string; required?: boolean }) {
  const [text, setText] = useState(toDisplay(defaultValue));
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [validationError, setValidationError] = useState("");
  const initialDate = defaultValue ? toDate(defaultValue) : new Date();
  const [month, setMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const today = toIso(new Date());

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index - start + 1);
      return { date, currentMonth: date.getMonth() === month.getMonth() };
    });
  }, [month]);

  function commitText(nextText: string) {
    const parsed = parseDate(nextText);
    if (parsed && parsed <= today) {
      setValue(parsed);
      const date = toDate(parsed);
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      return;
    }
    setValue("");
  }

  function validate(nextText: string) {
    const parsed = parseDate(nextText);
    const message = !nextText && required
      ? "Vui lòng nhập ngày sinh."
      : nextText && (!parsed || parsed > today)
        ? "Vui lòng nhập ngày sinh hợp lệ, không ở tương lai."
        : "";
    setValidationError(message);
    inputRef.current?.setCustomValidity(message);
    return !message;
  }

  function showCalendar() {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    setOpenUpward(Boolean(bounds && window.innerHeight - bounds.bottom < 360));
    setOpen(true);
  }

  function chooseDate(date: Date) {
    const next = toIso(date);
    if (next > today) return;
    setValue(next);
    setText(toDisplay(next));
    setValidationError("");
    inputRef.current?.setCustomValidity("");
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative mt-1">
      <input type="hidden" name={name} value={value} required={required} />
      <label htmlFor={inputId} className="sr-only">Nhập ngày sinh</label>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          value={text}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
            const formatted = digits.replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2}\/\d{2})(\d)/, "$1/$2");
            setText(formatted);
            if (formatted.length === 10) commitText(formatted);
            else setValue("");
            if (validationError) validate(formatted);
          }}
          onBlur={() => {
            if (text && value) setText(toDisplay(value));
            validate(text);
          }}
          onFocus={showCalendar}
          required={required}
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          aria-invalid={Boolean(validationError)}
          className={`field pr-10 ${validationError ? "!border-red-500 !bg-red-50" : ""}`}
        />
        <button type="button" onClick={() => open ? setOpen(false) : showCalendar()} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#2F78C8] hover:bg-[#E7F1FB]" aria-label="Mở lịch chọn ngày sinh" aria-expanded={open}>
          <CalendarDays size={17} />
        </button>
      </div>
      {validationError && <p className="mt-1 text-[11px] font-medium text-red-600">{validationError}</p>}
      {open && (
        <div className={`absolute z-[90] w-[18.5rem] rounded-2xl border border-[#D7E8F8] bg-white p-3 shadow-xl ${openUpward ? "bottom-full mb-2" : "mt-2"}`}>
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="rounded-lg p-1.5 hover:bg-[#F4F8FD]" aria-label="Tháng trước"><ChevronLeft size={18} /></button>
            <strong className="text-sm text-[#173A5E]">{months[month.getMonth()]} {month.getFullYear()}</strong>
            <button type="button" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="rounded-lg p-1.5 hover:bg-[#F4F8FD]" aria-label="Tháng sau"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-[#5A7799]">{weekDays.map((day) => <span key={day} className="py-1">{day}</span>)}</div>
          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map(({ date, currentMonth }) => {
              const dateValue = toIso(date);
              const selected = dateValue === value;
              const disabled = dateValue > today;
              return <button key={dateValue} type="button" disabled={disabled} onClick={() => chooseDate(date)} className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs transition ${selected ? "bg-[#2F78C8] font-bold text-white" : currentMonth ? "text-[#173A5E] hover:bg-[#E7F1FB]" : "text-[#9BB0C5] hover:bg-[#F4F8FD]"} disabled:cursor-not-allowed disabled:opacity-35`}>{date.getDate()}</button>;
            })}
          </div>
          <button type="button" onClick={() => { const current = new Date(); setMonth(new Date(current.getFullYear(), current.getMonth(), 1)); }} className="mt-3 text-xs font-bold text-[#2F78C8] hover:underline">Hôm nay</button>
        </div>
      )}
    </div>
  );
}

export function PatientGenderField({ name, defaultValue = "male" }: { name: string; defaultValue?: PatientGender }) {
  const [value, setValue] = useState<PatientGender>(defaultValue);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const label = genderOptions.find((option) => option.value === value)?.label;
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);
  return (
    <div ref={wrapperRef} className="relative mt-1">
      <input type="hidden" name={name} value={value} />
      <button type="button" onClick={() => setOpen((current) => !current)} className="field flex items-center justify-between text-left" aria-haspopup="listbox" aria-expanded={open}>
        <span>{label}</span><ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div role="listbox" className="absolute z-[90] mt-2 w-full rounded-xl border border-[#D7E8F8] bg-white p-1.5 shadow-xl">
        {genderOptions.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => { setValue(option.value); setOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-[#173A5E] hover:bg-[#F4F8FD]">
          {option.label}{option.value === value && <Check size={15} className="text-[#2F78C8]" />}
        </button>)}
      </div>}
    </div>
  );
}

export function PatientNameField({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(nextValue: string) {
    const message = nextValue.trim() ? "" : "Vui lòng nhập họ và tên.";
    setError(message);
    inputRef.current?.setCustomValidity(message);
  }

  return (
    <div className="mt-1">
      <input
        ref={inputRef}
        required
        name="full_name"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) validate(event.target.value);
        }}
        onBlur={(event) => validate(event.target.value)}
        placeholder="Nhập họ và tên"
        aria-invalid={Boolean(error)}
        className={`field ${error ? "!border-red-500 !bg-red-50" : ""}`}
      />
      {error && <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}
