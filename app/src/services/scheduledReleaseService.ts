export type ReleaseMode = "song" | "album";
export type ScheduledReleaseStatus = "scheduled" | "published";

export interface ScheduledRelease {
  id: number;
  title: string;
  mode: ReleaseMode;
  genre: string;
  scheduledAt: string;
  status: ScheduledReleaseStatus;
}

export interface ScheduleReleasePayload {
  title: string;
  mode: ReleaseMode;
  genre: string;
  scheduledAt: string;
}

const SCHEDULED_RELEASES: ScheduledRelease[] = [];
let nextId = 1;

export function scheduleRelease(payload: ScheduleReleasePayload): ScheduledRelease {
  const release: ScheduledRelease = {
    id: nextId++,
    title: payload.title,
    mode: payload.mode,
    genre: payload.genre,
    scheduledAt: payload.scheduledAt,
    status: "scheduled",
  };
  SCHEDULED_RELEASES.push(release);
  return release;
}

export function getScheduledReleases(): ScheduledRelease[] {
  return SCHEDULED_RELEASES;
}

/** Flips any due `"scheduled"` release to `"published"`. Returns the releases it just published. */
export function publishDueReleases(now: Date = new Date()): ScheduledRelease[] {
  const published: ScheduledRelease[] = [];
  for (const release of SCHEDULED_RELEASES) {
    if (release.status === "scheduled" && new Date(release.scheduledAt).getTime() <= now.getTime()) {
      release.status = "published";
      published.push(release);
    }
  }
  return published;
}

export function formatScheduledAt(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
