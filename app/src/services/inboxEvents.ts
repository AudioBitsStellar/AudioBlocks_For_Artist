/**
 * Inbox unread-count change notification (#146).
 *
 * The navigation badges (Sidebar, MobileNav) read the unread total once and
 * then listen for this event, which the message services dispatch whenever a
 * conversation's unread state changes. Cross-tab changes arrive through the
 * browser's own `storage` event, which the listeners also handle.
 */
export const INBOX_UNREAD_CHANGED_EVENT = "audioblocks:inbox-unread-changed";

export function notifyInboxUnreadChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INBOX_UNREAD_CHANGED_EVENT));
}

/** Subscribe to unread-count changes (same tab and other tabs). Returns an unsubscribe. */
export function subscribeToInboxUnread(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(INBOX_UNREAD_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(INBOX_UNREAD_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
