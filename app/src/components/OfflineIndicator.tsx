'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Renders a compact banner whenever the browser is offline so users know
 * cached content is being served. Listens to standard `online`/`offline`
 * events and also re-reads `navigator.onLine` on mount + visibility change.
 */
export default function OfflineIndicator() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const onVisibility = () => setOnline(navigator.onLine);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-indicator"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-2 text-sm font-medium text-black shadow-md"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span>You&apos;re offline — showing cached content. Some features may be unavailable.</span>
    </div>
  );
}
