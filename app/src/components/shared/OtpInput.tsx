"use client";

import { useCallback, useEffect, useRef } from "react";
import { CODE_LENGTH } from "@/services/emailVerificationService";

export interface OtpInputProps {
  /** The digits entered so far, as a plain string of at most `CODE_LENGTH`. */
  value: string;
  onChange: (value: string) => void;
  /** Fired once every box is filled, with the complete code. */
  onComplete?: (code: string) => void;
  disabled?: boolean;
  /** Prefix for the generated input ids and their accessible names. */
  name?: string;
  length?: number;
  autoFocus?: boolean;
}

const ONLY_DIGITS = /\D/g;

/**
 * Split single-character inputs for a one-time code, the way SMS/2FA entry
 * fields behave: one digit per box, auto-advance, Backspace steps back, arrow
 * keys move, and a pasted code fans out across the boxes.
 *
 * Kept uncontrolled-by-parent on purpose — `value` is the source of truth so
 * the caller can clear it after a wrong attempt.
 */
export default function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  name = "otp",
  length = CODE_LENGTH,
  autoFocus = false,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const focusBox = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(index, 0), length - 1);
      refs.current[clamped]?.focus();
      refs.current[clamped]?.select();
    },
    [length]
  );

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const commit = useCallback(
    (next: string) => {
      const trimmed = next.slice(0, length);
      onChange(trimmed);
      if (trimmed.length === length) onComplete?.(trimmed);
    },
    [length, onChange, onComplete]
  );

  const handleChange = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const entered = event.target.value.replace(ONLY_DIGITS, "");
    if (!entered) {
      // Deleting the character in this box; the Backspace handler owns caret
      // movement, so just drop the digit here.
      const next = `${value.slice(0, index)}${value.slice(index + 1)}`;
      commit(next);
      return;
    }
    // A paste or a fast typist can land several digits in one event: fan them
    // out from this box rather than truncating to the first.
    const next = `${value.slice(0, index)}${entered}`.slice(0, length);
    commit(next);
    focusBox(Math.min(index + entered.length, length - 1));
  };

  const handleKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (value[index]) {
        const next = `${value.slice(0, index)}${value.slice(index + 1)}`;
        commit(next);
        focusBox(index);
      } else if (index > 0) {
        const next = `${value.slice(0, index - 1)}${value.slice(index)}`;
        commit(next);
        focusBox(index - 1);
      }
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowLeft") {
      focusBox(index - 1);
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowRight") {
      focusBox(index + 1);
      event.preventDefault();
      return;
    }
    // Allow type-over: a digit replaces whatever was in the box.
    if (/^[0-9]$/.test(event.key)) {
      const next = `${value.slice(0, index)}${event.key}${value.slice(index + 1)}`;
      commit(next.replace(ONLY_DIGITS, ""));
      focusBox(index + 1);
      event.preventDefault();
    }
  };

  const handlePaste = (index: number) => (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(ONLY_DIGITS, "");
    if (!pasted) return;
    event.preventDefault();
    const next = `${value.slice(0, index)}${pasted}`.slice(0, length);
    commit(next);
    focusBox(next.length);
  };

  return (
    <div
      role="group"
      aria-label="Verification code"
      className="flex gap-2 justify-between md:justify-start"
    >
      {digits.map((digit, index) => (
        <input
          key={`${name}-${index}`}
          id={`${name}-${index}`}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste(index)}
          className="w-11 h-12 text-center text-white text-lg font-semibold rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D2045B] disabled:opacity-50"
          style={{
            background: "#FFFFFF0A",
            border: "1px solid #2A2A2A",
          }}
        />
      ))}
    </div>
  );
}
