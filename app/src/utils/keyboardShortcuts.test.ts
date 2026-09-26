import { describe, it, expect } from "vitest";
import {
  GENERAL_SHORTCUTS,
  GOTO_PREFIX,
  GOTO_SHORTCUTS,
  SHOW_HELP_KEY,
  isEditableTarget,
  keysFor,
  normalizeKey,
  resolveKeyPress,
  type KeyPress,
  type ShortcutState,
} from "./keyboardShortcuts";

/** A keystroke with no modifiers, which is what most of these cases test. */
function press(key: string, modifiers: Partial<KeyPress> = {}): KeyPress {
  return { key, ...modifiers };
}

const IDLE: ShortcutState = { awaitingPrefix: false, helpOpen: false };
const AWAITING: ShortcutState = { awaitingPrefix: true, helpOpen: false };
const HELP_OPEN: ShortcutState = { awaitingPrefix: false, helpOpen: true };

describe("shortcut definitions (#462)", () => {
  it("binds each destination to one distinct key", () => {
    const keys = GOTO_SHORTCUTS.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never reuses the prefix key as the second keystroke of another row", () => {
    // `g g` is settings, so the prefix has to stay meaningful as a second key.
    expect(GOTO_SHORTCUTS.some((entry) => entry.key === GOTO_PREFIX)).toBe(true);
  });

  it("only points at dashboard sections", () => {
    for (const entry of GOTO_SHORTCUTS) {
      expect(entry.href.startsWith("/dashboard/")).toBe(true);
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it("lists the team page it shares with the audit trail", () => {
    expect(GOTO_SHORTCUTS.map((entry) => entry.href)).toContain("/dashboard/team");
  });

  it("renders go-to rows as a two-key sequence", () => {
    expect(keysFor({ key: "m", label: "My Music", href: "/dashboard/my-music" })).toEqual([
      "g",
      "m",
    ]);
  });

  it("documents only shortcuts that actually exist", () => {
    // "?" is handled here; the ⌘K row is advertised because TopHeader answers it.
    const handled = GENERAL_SHORTCUTS.filter((entry) => entry.keys.length === 1);
    expect(handled.map((entry) => entry.keys[0])).toEqual([SHOW_HELP_KEY, "Escape"]);
  });
});

describe("normalizeKey", () => {
  it("folds case so a shifted keystroke still matches", () => {
    expect(normalizeKey("G")).toBe("g");
  });

  it("keeps symbol keys intact", () => {
    expect(normalizeKey("?")).toBe("?");
  });

  it("rejects named keys, which belong to other components", () => {
    expect(normalizeKey("Escape")).toBe("");
    expect(normalizeKey("Shift")).toBe("");
    expect(normalizeKey("Meta")).toBe("");
    expect(normalizeKey("ArrowDown")).toBe("");
  });

  it("rejects an empty key", () => {
    expect(normalizeKey("")).toBe("");
  });
});

describe("isEditableTarget", () => {
  it("lets fields keep their keystrokes", () => {
    for (const tag of ["input", "textarea", "select"]) {
      const field = document.createElement(tag);
      document.body.append(field);
      expect(isEditableTarget(field)).toBe(true);
      field.remove();
    }
  });

  it("lets a rich text editor keep its keystrokes", () => {
    const editor = document.createElement("div");
    // The attribute, which is what React's contentEditable prop produces.
    editor.setAttribute("contenteditable", "true");
    const nested = document.createElement("span");
    editor.append(nested);
    document.body.append(editor);
    expect(isEditableTarget(editor)).toBe(true);
    // Focus sits on the element inside the editable host, not the host itself.
    expect(isEditableTarget(nested)).toBe(true);
    editor.remove();
  });

  it("does not fire for page chrome", () => {
    const button = document.createElement("button");
    document.body.append(button);
    expect(isEditableTarget(button)).toBe(false);
    button.remove();
  });

  it("returns false for a window event target and for nothing", () => {
    expect(isEditableTarget(window)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget(undefined)).toBe(false);
  });
});

describe("resolveKeyPress", () => {
  it("starts a sequence on the prefix", () => {
    expect(resolveKeyPress(press("g"), IDLE)).toEqual({ type: "await-sequence" });
  });

  it("navigates to the section bound to the second key", () => {
    expect(resolveKeyPress(press("o"), AWAITING)).toEqual({
      type: "navigate",
      href: "/dashboard/overview",
      label: "Overview",
    });
  });

  it("navigates whatever the case of the second key", () => {
    expect(resolveKeyPress(press("M"), AWAITING)).toEqual({
      type: "navigate",
      href: "/dashboard/my-music",
      label: "My Music",
    });
  });

  it("resolves every bound key", () => {
    for (const entry of GOTO_SHORTCUTS) {
      const effect = resolveKeyPress(press(entry.key), AWAITING);
      expect(effect).toMatchObject({ type: "navigate", href: entry.href });
    }
  });

  it("ends the sequence on an unbound second key", () => {
    expect(resolveKeyPress(press("z"), AWAITING)).toEqual({ type: "ignore" });
  });

  it("shows the shortcut list once", () => {
    expect(resolveKeyPress(press("?"), IDLE)).toEqual({ type: "show-help" });
  });

  it("hides the shortcut list on the same key", () => {
    expect(resolveKeyPress(press("?"), HELP_OPEN)).toEqual({ type: "hide-help" });
  });

  it("ignores a second help request while awaiting a sequence", () => {
    // Better to drop the stray "?" than to open an overlay the artist did not ask for.
    expect(resolveKeyPress(press("?"), AWAITING)).toEqual({ type: "ignore" });
  });

  it("leaves Escape for the dialogs that already handle it", () => {
    expect(resolveKeyPress(press("Escape"), IDLE)).toEqual({ type: "ignore" });
    expect(resolveKeyPress(press("Escape"), HELP_OPEN)).toEqual({ type: "ignore" });
  });

  it("does not touch keys it has not claimed", () => {
    expect(resolveKeyPress(press("n"), IDLE)).toEqual({ type: "ignore" });
    expect(resolveKeyPress(press("k"), IDLE)).toEqual({ type: "ignore" });
  });

  it("leaves ⌘, Ctrl and Alt combinations to the browser", () => {
    expect(resolveKeyPress(press("g", { meta: true }), IDLE)).toEqual({ type: "ignore" });
    expect(resolveKeyPress(press("k", { ctrl: true }), IDLE)).toEqual({ type: "ignore" });
    expect(resolveKeyPress(press("i", { alt: true }), IDLE)).toEqual({ type: "ignore" });
    // A held modifier mid-sequence is the browser's, not a navigation key.
    expect(resolveKeyPress(press("o", { meta: true }), AWAITING)).toEqual({ type: "ignore" });
  });

  it("still reads shifted keys, which is how ? is typed", () => {
    expect(resolveKeyPress(press("?"), IDLE)).toEqual({ type: "show-help" });
  });
});
