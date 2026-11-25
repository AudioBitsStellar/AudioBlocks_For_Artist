"use client";

import { useEffect } from "react";
import { activeMockSurfaces } from "@/lib/featureFlags";

let logged = false;

/**
 * One dashboard-wide line naming every surface on sample data (#52), so an
 * artist on a demo or staging deploy is never left to guess which numbers are
 * theirs. Renders nothing once every surface is on real data.
 */
export default function MockDataNotice({
  surfaces = activeMockSurfaces(),
}: {
  surfaces?: string[];
}) {
  useEffect(() => {
    if (logged || surfaces.length === 0 || process.env.NODE_ENV === "production") return;
    logged = true;
    // eslint-disable-next-line no-console
    console.info(`[AudioBlocks] Sample data is shown for: ${surfaces.join(", ")}`);
  }, [surfaces]);

  if (surfaces.length === 0) return null;

  return (
    <div
      role="note"
      data-testid="mock-data-notice"
      className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-900 dark:text-amber-100"
    >
      <span className="font-semibold">Sample data:</span> {surfaces.join(", ")}{" "}
      {surfaces.length === 1 ? "is" : "are"} not showing your real data yet.
    </div>
  );
}

export { MockDataNotice };
