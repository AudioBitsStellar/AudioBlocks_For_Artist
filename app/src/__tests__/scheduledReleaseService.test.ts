import { describe, it, expect, beforeEach } from "vitest";
import {
  scheduleRelease,
  getScheduledReleases,
  publishDueReleases,
} from "@/services/scheduledReleaseService";

describe("scheduledReleaseService", () => {
  beforeEach(() => {
    getScheduledReleases().length = 0;
  });

  it("creates a scheduled release with status 'scheduled'", () => {
    const release = scheduleRelease({
      title: "My Song",
      mode: "song",
      genre: "Pop",
      scheduledAt: "2030-01-01T10:00:00.000Z",
    });

    expect(release.status).toBe("scheduled");
    expect(release.title).toBe("My Song");
    expect(getScheduledReleases()).toContainEqual(release);
  });

  it("publishes releases whose scheduled time has passed and leaves future ones alone", () => {
    const due = scheduleRelease({
      title: "Due Song",
      mode: "song",
      genre: "Rock",
      scheduledAt: "2025-01-01T00:00:00.000Z",
    });
    const notDue = scheduleRelease({
      title: "Future Song",
      mode: "song",
      genre: "Jazz",
      scheduledAt: "2030-01-01T00:00:00.000Z",
    });

    const published = publishDueReleases(new Date("2026-01-01T00:00:00.000Z"));

    expect(published.map((r) => r.id)).toEqual([due.id]);
    expect(getScheduledReleases().find((r) => r.id === due.id)?.status).toBe("published");
    expect(getScheduledReleases().find((r) => r.id === notDue.id)?.status).toBe("scheduled");
  });

  it("does not re-publish an already-published release", () => {
    const release = scheduleRelease({
      title: "Old Song",
      mode: "album",
      genre: "Folk",
      scheduledAt: "2025-01-01T00:00:00.000Z",
    });
    publishDueReleases(new Date("2026-01-01T00:00:00.000Z"));

    const published = publishDueReleases(new Date("2027-01-01T00:00:00.000Z"));

    expect(published.map((r) => r.id)).not.toContain(release.id);
  });
});
