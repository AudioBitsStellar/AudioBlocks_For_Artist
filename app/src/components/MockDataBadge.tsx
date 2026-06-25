'use client';

/**
 * Renders a small amber badge in development when a surface is showing
 * mock data. Renders nothing in production (NEXT_PUBLIC_USE_MOCK_DATA unset
 * or false) so it never ships to real users.
 */
export default function MockDataBadge({ label }: { label: string }) {
  if (process.env.NODE_ENV === 'production') return null;
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'true') return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400 ml-2">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      Mock
    </span>
  );
}
