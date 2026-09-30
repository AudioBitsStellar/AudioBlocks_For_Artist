"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/shared/Modal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  GENERAL_SHORTCUTS,
  GOTO_SHORTCUTS,
  SHOW_HELP_KEY,
  SEQUENCE_TIMEOUT_MS,
  isEditableTarget,
  keysFor,
  resolveKeyPress,
  type KeyOrder,
  type ShortcutState,
} from "@/utils/keyboardShortcuts";

/** The keys of a shortcut, rendered as keystrokes joined by how they combine. */
function Keys({ keys, order = "then" }: { keys: ReadonlyArray<string>; order?: KeyOrder }) {
  return (
    <span className="flex items-center gap-1.5">
      {keys.map((key, index) => (
        <span key={`${key}-${index}`} className="flex items-center gap-1.5">
          {index > 0 ? (
            <span className="text-xs text-[#A3A3A3]">{order === "with" ? "+" : "then"}</span>
          ) : null}
          <kbd className="min-w-6 rounded-md border border-[#2A2A2A] bg-[#171717] px-2 py-1 text-center font-mono text-xs text-white">
            {key}
          </kbd>
        </span>
      ))}
    </span>
  );
}

/**
 * The dashboard's keyboard shortcuts, and the `?` list that documents them
 * (#462).
 *
 * Mounted once by the dashboard layout so the state — a half-typed `g` sequence
 * and the shortcut list — survives moving between sections. What the keys do is
 * decided by the pure resolver in `utils/keyboardShortcuts`; this component only
 * listens and applies the effect.
 */
export default function DashboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const awaitingPrefix = useRef(false);
  const sequenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openUpload = useCallback(() => router.push("/dashboard/upload-music"), [router]);
  const { enabled, setEnabled } = useKeyboardShortcuts({ onUpload: openUpload });

  useEffect(() => {
    const endSequence = () => {
      if (sequenceTimer.current !== null) clearTimeout(sequenceTimer.current);
      sequenceTimer.current = null;
      awaitingPrefix.current = false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isEditableTarget(event.target)) return;

      // Keep the help/preferences panel reachable so shortcuts can be turned
      // back on after the user disables them.
      if (!enabled) {
        if (event.key === SHOW_HELP_KEY && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          setHelpOpen(true);
        }
        endSequence();
        return;
      }

      const state: ShortcutState = { awaitingPrefix: awaitingPrefix.current, helpOpen };
      const effect = resolveKeyPress(
        { key: event.key, meta: event.metaKey, ctrl: event.ctrlKey, alt: event.altKey },
        state
      );

      if (effect.type === "ignore") {
        // Any unrelated keystroke — including Escape — ends a pending sequence,
        // so a lone `g` cannot hijack whatever the artist presses next.
        endSequence();
        return;
      }

      event.preventDefault();

      if (effect.type === "await-sequence") {
        awaitingPrefix.current = true;
        sequenceTimer.current = setTimeout(endSequence, SEQUENCE_TIMEOUT_MS);
        return;
      }

      endSequence();
      if (effect.type === "show-help") setHelpOpen(true);
      else if (effect.type === "hide-help") setHelpOpen(false);
      else {
        // The list is an overlay, not a page: drop it so the new section is
        // readable rather than hidden behind it.
        setHelpOpen(false);
        router.push(effect.href);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      endSequence();
    };
  }, [enabled, helpOpen, router]);

  return (
    <Modal
      open={helpOpen}
      onOpenChange={setHelpOpen}
      title="Keyboard shortcuts"
      subtitle="Artist dashboard"
      size="lg"
      closeAriaLabel="Close keyboard shortcuts"
    >
      <div className="space-y-6">
        <section aria-labelledby="shortcut-go-to-heading">
          <h3
            id="shortcut-go-to-heading"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A3A3A3]"
          >
            Go to
          </h3>
          <dl className="mt-3 space-y-2">
            {GOTO_SHORTCUTS.map((entry) => (
              <div key={entry.href} className="flex items-center justify-between gap-4">
                <dt className="text-sm text-white">{entry.label}</dt>
                <dd className="m-0">
                  <Keys keys={keysFor(entry)} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="shortcut-general-heading">
          <h3
            id="shortcut-general-heading"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A3A3A3]"
          >
            General
          </h3>
          <dl className="mt-3 space-y-2">
            {GENERAL_SHORTCUTS.map((entry) => (
              <div key={entry.label} className="flex items-start justify-between gap-4">
                <dt className="text-sm text-white">
                  {entry.label}
                  <span className="mt-0.5 block text-xs text-[#A3A3A3]">{entry.detail}</span>
                </dt>
                <dd className="m-0 pt-0.5">
                  <Keys keys={entry.keys} order={entry.order} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="text-xs leading-relaxed text-[#A3A3A3]">
          Navigation shortcuts pause while you are typing. Search, Save, and Upload work with ⌘ or
          Ctrl; other browser shortcuts are left untouched.
        </p>
        <label className="flex items-center gap-3 border-t border-[#2A2A2A] pt-4 text-sm text-white">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            aria-label="Enable keyboard shortcuts"
            className="h-4 w-4 accent-[#D2045B]"
          />
          Enable keyboard shortcuts
          <span className="text-xs text-[#A3A3A3]">Preference saved on this device</span>
        </label>
      </div>
    </Modal>
  );
}
