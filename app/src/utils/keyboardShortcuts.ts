/**
 * Keyboard shortcuts for the artist dashboard (#462).
 *
 * The definitions and the key resolver are plain data and pure functions so the
 * sequence rules can be tested without a DOM; `DashboardShortcuts` is the thin
 * window listener that binds them to the router.
 *
 * Two rules keep the shortcuts out of the way of everything else on the page:
 *  - nothing fires while a text field has focus (see {@link isEditableTarget}),
 *    so typing a track title never jumps to another section;
 *  - nothing fires while ⌘, Ctrl or Alt is held, so browser combos — including
 *    the ⌘K search owned by `TopHeader` — are left untouched.
 */

/** Key that starts a "go to" sequence. */
export const GOTO_PREFIX = "g";

/** Key that shows or hides the shortcut list. */
export const SHOW_HELP_KEY = "?";

/**
 * How long the second key of a `g` sequence may take to arrive. Long enough to
 * type deliberately, short enough that an abandoned `g` does not silently
 * swallow the next key the artist presses.
 */
export const SEQUENCE_TIMEOUT_MS = 2000;

export interface GoToShortcut {
  /** Key typed after {@link GOTO_PREFIX}; kept lower-case and single. */
  key: string;
  /** Section name as the artist sees it in the sidebar. */
  label: string;
  href: string;
}

/**
 * Destinations, in sidebar order. Every `href` is a route that exists under
 * `app/dashboard`; Premium is deliberately absent because the sidebar links to
 * a page that has not been built yet.
 */
export const GOTO_SHORTCUTS: ReadonlyArray<GoToShortcut> = [
  { key: "o", label: "Overview", href: "/dashboard/overview" },
  { key: "m", label: "My Music", href: "/dashboard/my-music" },
  { key: "a", label: "Analytics", href: "/dashboard/analytics" },
  { key: "e", label: "Events", href: "/dashboard/events" },
  { key: "c", label: "Merches", href: "/dashboard/merches" },
  { key: "i", label: "Messages", href: "/dashboard/messages" },
  { key: "t", label: "Team", href: "/dashboard/team" },
  { key: "u", label: "Upload music", href: "/dashboard/upload-music" },
  { key: "p", label: "Profile", href: "/dashboard/profile" },
  { key: "g", label: "Settings", href: "/dashboard/settings/notifications" },
];

export interface KeyPress {
  /** `KeyboardEvent.key`, before any case folding. */
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  alt?: boolean;
}

export interface ShortcutState {
  /** True while {@link GOTO_PREFIX} has been typed and its partner is expected. */
  awaitingPrefix: boolean;
  /** True while the shortcut list is on screen. */
  helpOpen: boolean;
}

export type ShortcutEffect =
  | { type: "navigate"; href: string; label: string }
  | { type: "show-help" }
  | { type: "hide-help" }
  | { type: "await-sequence" }
  | { type: "ignore" };

const IGNORE: ShortcutEffect = { type: "ignore" };

/** How the keys of a shortcut combine. */
export type KeyOrder = "then" | "with";

/** Rows that are not navigation, shown under their own heading in the list. */
export interface GeneralShortcut {
  /** Keys to press, in order. Display labels, not matcher input. */
  keys: ReadonlyArray<string>;
  order: KeyOrder;
  label: string;
  detail: string;
}

export const GENERAL_SHORTCUTS: ReadonlyArray<GeneralShortcut> = [
  {
    keys: [SHOW_HELP_KEY],
    order: "then",
    label: "Keyboard shortcuts",
    detail: "Show or hide this list",
  },
  {
    keys: ["Escape"],
    order: "then",
    label: "Close",
    detail: "Dismiss dialogs, menus and this list",
  },
  {
    keys: ["⌘ / Ctrl", "K"],
    order: "with",
    label: "Search",
    detail: "Open the header search box",
  },
];

/** The two keystrokes for a destination, typed one after the other. */
export function keysFor(entry: GoToShortcut): ReadonlyArray<string> {
  return [GOTO_PREFIX, entry.key];
}

/**
 * Lower-cases a key and rejects anything that cannot be a shortcut.
 *
 * Case is folded so Shift+G still reads as `g`; a name longer than one
 * character means the press was a bare modifier or Escape, both of which other
 * components already own.
 */
export function normalizeKey(key: string): string {
  if (typeof key !== "string" || key.length !== 1) return "";
  return key.toLowerCase();
}

/**
 * True when the keystroke belongs to a form control rather than to the page.
 *
 * Widgets expose a keyboard interface on their inner elements, so the check
 * walks up to the nearest editable host instead of only looking at the target.
 */
export function isEditableTarget(target: unknown): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest("input, textarea, select, [contenteditable='true']") !== null;
}

/**
 * Decides what a single keystroke means given where the sequence stands.
 *
 * Pure: the caller holds `awaitingPrefix` and `helpOpen` and applies the effect.
 */
export function resolveKeyPress(press: KeyPress, state: ShortcutState): ShortcutEffect {
  if (press.meta === true || press.ctrl === true || press.alt === true) return IGNORE;

  const key = normalizeKey(press.key);
  if (key === "") return IGNORE;

  if (state.awaitingPrefix) {
    const entry = GOTO_SHORTCUTS.find((candidate) => candidate.key === key);
    return entry
      ? { type: "navigate", href: entry.href, label: entry.label }
      : // An unbound second key ends the sequence, so the next press starts over
        // rather than navigating on a stale `g`.
        IGNORE;
  }

  if (key === normalizeKey(SHOW_HELP_KEY)) {
    return state.helpOpen ? { type: "hide-help" } : { type: "show-help" };
  }
  if (key === GOTO_PREFIX) return { type: "await-sequence" };
  return IGNORE;
}
