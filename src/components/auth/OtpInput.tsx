"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

export default function OtpInput({
  name,
  length = 6,
  autoFocus = true,
  disabled = false,
}: {
  name: string;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

const value = digits.join("");

function fillFrom(index: number, chars: string[]) {
  setDigits((prev) => {
    const next = [...prev];
    let idx = index;
    for (const ch of chars) {
      if (idx >= length) break;
      next[idx] = ch;
      idx++;
    }
    return next;
  });
  const last = Math.min(index + chars.length, length) - 1;
  if (last >= 0) {
    requestAnimationFrame(() => refs.current[last]?.focus());
  }
}

function handleChange(i: number, raw: string) {
  const digitsOnly = raw.replace(/\D/g, "");
  if (!digitsOnly) {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = "";
      return next;
    });
    return;
  }
  fillFrom(i, digitsOnly.split(""));
}

function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Backspace") {
    e.preventDefault();
    if (digits[i]) {
      setDigits((prev) => {
        const next = [...prev];
        next[i] = "";
        return next;
      });
    } else if (i > 0) {
      setDigits((prev) => {
        const next = [...prev];
        next[i - 1] = "";
        return next;
      });
      refs.current[i - 1]?.focus();
    }
  } else if (e.key === "ArrowLeft" && i > 0) {
    e.preventDefault();
    refs.current[i - 1]?.focus();
  } else if (e.key === "ArrowRight" && i < length - 1) {
    e.preventDefault();
    refs.current[i + 1]?.focus();
  }
}

function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
  const text = e.clipboardData.getData("text").replace(/\D/g, "");
  if (!text) return;
  e.preventDefault();
  fillFrom(0, text.slice(0, length).split(""));
}

return (
  <div>
  <input type="hidden" name={name} value={value} readOnly />
  <div className="flex items-center gap-2 justify-between" onPaste={handlePaste}>
    {digits.map((d, i) => (
    <input
      key={i}
      ref={(el) => {
        refs.current[i] = el;
      }}
      type="text"
      inputMode="numeric"
      autoComplete={i === 0 ? "one-time-code" : "off"}
      maxLength={length}
      value={d}
      disabled={disabled}
      autoFocus={autoFocus && i === 0}
      onChange={(e) => handleChange(i, e.target.value)}
      onKeyDown={(e) => handleKeyDown(i, e)}
      className="otp-box"
      aria-label={`Chữ số ${i + 1}`}
      />
    ))}
  </div>
  </div>
  );
}
