'use client';

import { Clock, LogOut, RefreshCw } from 'lucide-react';

interface SessionWarningModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Seconds remaining until session expiry */
  secondsRemaining: number;
  /** Called when the user clicks "Extend Session" */
  onExtend: () => void;
  /** Called when the user clicks "Log Out" */
  onLogout: () => void;
  /** Whether a refresh is in progress */
  isRefreshing?: boolean;
}

/**
 * Modal that warns the user their session is about to expire.
 *
 * Shows a countdown and offers two actions: extend (refresh token) or log out.
 */
export default function SessionWarningModal({
  isOpen,
  secondsRemaining,
  onExtend,
  onLogout,
  isRefreshing = false,
}: SessionWarningModalProps) {
  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="alertdialog"
      aria-modal="true"
      aria-label="Session expiring soon"
    >
      <div className="bg-surface-raised rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-warning" aria-hidden="true" />
          </div>
          <h2 className="text-text text-lg font-semibold">Session Expiring</h2>
        </div>
        <p className="text-text-muted text-sm mb-2">
          Your session will expire in <strong className="text-text">{timeDisplay}</strong>.
        </p>
        <p className="text-text-muted text-sm mb-6">
          Extend your session to continue working, or log out to save your progress.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onExtend}
            disabled={isRefreshing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-contrast rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isRefreshing ? 'Extending…' : 'Extend Session'}
          </button>
          <button
            onClick={onLogout}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-text-muted rounded-lg text-sm font-medium hover:bg-surface-sunken transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
