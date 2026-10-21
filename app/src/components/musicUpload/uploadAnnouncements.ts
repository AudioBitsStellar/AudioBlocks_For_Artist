export const PROGRESS_MILESTONES = [25, 50, 75, 100] as const;

/**
 * Returns the highest milestone reached that is above `lastAnnounced`, or null
 * when there is nothing new to announce. Keeps the live region quiet: a
 * screen reader hears four progress updates, not one per percent.
 */
export function nextMilestone(progress: number, lastAnnounced: number): number | null {
  const reached = PROGRESS_MILESTONES.filter((m) => progress >= m && m > lastAnnounced);
  return reached.length ? reached[reached.length - 1] : null;
}

export function milestoneMessage(fileName: string, milestone: number): string {
  return milestone === 100
    ? `${fileName} fully uploaded, finishing up`
    : `Uploading ${fileName}, ${milestone}%`;
}
